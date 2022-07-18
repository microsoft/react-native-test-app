#include "pch.h"

#include "MainPage.h"

#include <algorithm>

#include <winrt/Windows.ApplicationModel.Core.h>
#include <winrt/Windows.UI.Popups.h>
#include <winrt/Windows.UI.ViewManagement.h>
#include <winrt/Windows.UI.Xaml.Automation.Peers.h>
#include <winrt/Windows.UI.Xaml.Automation.Provider.h>

#include "MainPage.g.cpp"
#include "Session.h"

using ReactTestApp::Component;
using ReactTestApp::JSBundleSource;
using ReactTestApp::ReactInstance;
using ReactTestApp::Session;
using winrt::Microsoft::ReactNative::IJSValueWriter;
using winrt::Microsoft::ReactNative::ReactNativeHost;
using winrt::Microsoft::ReactNative::ReactRootView;
using winrt::ReactTestApp::implementation::MainPage;
using winrt::Windows::ApplicationModel::Core::CoreApplication;
using winrt::Windows::ApplicationModel::Core::CoreApplicationViewTitleBar;
using winrt::Windows::Foundation::IAsyncAction;
using winrt::Windows::Foundation::IInspectable;
using winrt::Windows::System::VirtualKey;
using winrt::Windows::System::VirtualKeyModifiers;
using winrt::Windows::UI::Colors;
using winrt::Windows::UI::Core::CoreDispatcherPriority;
using winrt::Windows::UI::Popups::MessageDialog;
using winrt::Windows::UI::ViewManagement::ApplicationView;
using winrt::Windows::UI::Xaml::RoutedEventArgs;
using winrt::Windows::UI::Xaml::Visibility;
using winrt::Windows::UI::Xaml::Window;
using winrt::Windows::UI::Xaml::Automation::Peers::MenuBarItemAutomationPeer;
using winrt::Windows::UI::Xaml::Controls::ContentDialogButtonClickEventArgs;
using winrt::Windows::UI::Xaml::Controls::MenuFlyoutItem;
using winrt::Windows::UI::Xaml::Controls::MenuFlyoutSeparator;
using winrt::Windows::UI::Xaml::Controls::TextBoxBeforeTextChangingEventArgs;
using winrt::Windows::UI::Xaml::Controls::ToggleMenuFlyoutItem;
using winrt::Windows::UI::Xaml::Input::KeyboardAccelerator;
using winrt::Windows::UI::Xaml::Navigation::NavigationEventArgs;

namespace
{
#ifdef _DEBUG
    constexpr bool kDebug = true;
#else
    constexpr bool kDebug = false;
#endif  // _DEBUG
    constexpr bool kSingleAppMode = static_cast<bool>(ENABLE_SINGLE_APP_MODE);

    void SetMenuItemText(IInspectable const &sender,
                         bool const isEnabled,
                         winrt::hstring const &enableText,
                         winrt::hstring const &disableText)
    {
        auto item = sender.as<MenuFlyoutItem>();
        item.Text(isEnabled ? disableText : enableText);
    }

    void SetBreakOnFirstLineMenuItem(IInspectable const &sender, bool const value)
    {
        SetMenuItemText(
            sender, value, L"Enable Break on First Line", L"Disable Break on First Line");
    }

    void SetDirectDebuggerMenuItem(IInspectable const &sender, bool const value)
    {
        SetMenuItemText(sender, value, L"Enable Direct Debugging", L"Disable Direct Debugging");
    }

    void SetFastRefreshMenuItem(IInspectable const &sender, bool const value)
    {
        SetMenuItemText(sender, value, L"Enable Fast Refresh", L"Disable Fast Refresh");
    }

    void SetWebDebuggerMenuItem(IInspectable const &sender, bool const value)
    {
        SetMenuItemText(
            sender, value, L"Enable Remote JS Debugging", L"Disable Remote JS Debugging");
    }

    void WritePropertyValue(std::any const &propertyValue, IJSValueWriter const &writer)
    {
        if (propertyValue.type() == typeid(bool)) {
            writer.WriteBoolean(std::any_cast<bool>(propertyValue));
        } else if (propertyValue.type() == typeid(std::int64_t)) {
            writer.WriteInt64(std::any_cast<std::int64_t>(propertyValue));
        } else if (propertyValue.type() == typeid(std::uint64_t)) {
            writer.WriteInt64(std::any_cast<std::uint64_t>(propertyValue));
        } else if (propertyValue.type() == typeid(double)) {
            writer.WriteDouble(std::any_cast<double>(propertyValue));
        } else if (propertyValue.type() == typeid(std::nullopt)) {
            writer.WriteNull();
        } else if (propertyValue.type() == typeid(std::string)) {
            writer.WriteString(winrt::to_hstring(std::any_cast<std::string>(propertyValue)));
        } else if (propertyValue.type() == typeid(std::vector<std::any>)) {
            writer.WriteArrayBegin();
            for (auto &&e : std::any_cast<std::vector<std::any>>(propertyValue)) {
                WritePropertyValue(e, writer);
            }
            writer.WriteArrayEnd();
        } else if (propertyValue.type() == typeid(std::map<std::string, std::any>)) {
            writer.WriteObjectBegin();
            for (auto &&e : std::any_cast<std::map<std::string, std::any>>(propertyValue)) {
                writer.WritePropertyName(winrt::to_hstring(e.first));
                WritePropertyValue(e.second, writer);
            }
            writer.WriteObjectEnd();
        } else {
            assert(false);
        }
    }

    void InitializeReactRootView(ReactNativeHost const &reactNativeHost,
                                 ReactRootView reactRootView,
                                 Component const &component)
    {
        if (reactRootView.ReactNativeHost() == nullptr) {
            reactRootView.ReactNativeHost(reactNativeHost);
        }

        reactRootView.ComponentName(winrt::to_hstring(component.appKey));
        reactRootView.InitialProps(
            [initialProps = component.initialProperties](IJSValueWriter const &writer) {
                if (initialProps.has_value()) {
                    writer.WriteObjectBegin();
                    for (auto &&property : initialProps.value()) {
                        auto &value = property.second;
                        writer.WritePropertyName(winrt::to_hstring(property.first));
                        WritePropertyValue(value, writer);
                    }
                    writer.WriteObjectEnd();
                }
            });
    }

    // According to
    // https://docs.microsoft.com/en-us/uwp/api/windows.system.virtualkeymodifiers?view=winrt-19041,
    // the following should work but doesn't. We implement our own operator
    // until we figure out why it doesn't.
    auto operator|(VirtualKeyModifiers lhs, VirtualKeyModifiers rhs)
    {
        return static_cast<VirtualKeyModifiers>(
            static_cast<std::underlying_type_t<VirtualKeyModifiers>>(lhs) |
            static_cast<std::underlying_type_t<VirtualKeyModifiers>>(rhs));
    }
}  // namespace

MainPage::MainPage()
{
    InitializeComponent();
    InitializeTitleBar();

    auto result = ::ReactTestApp::GetManifest();
    if (result.has_value()) {
        auto &[manifest, checksum] = result.value();

        manifestChecksum_ = std::move(checksum);

        AppTitle().Text(to_hstring(manifest.displayName));
        reactInstance_.BundleRoot(manifest.bundleRoot.has_value()
                                      ? std::make_optional(to_hstring(manifest.bundleRoot.value()))
                                      : std::nullopt);

        if constexpr (kSingleAppMode) {
            assert(manifest.singleApp.has_value() ||
                   !"`ENABLE_SINGLE_APP_MODE` shouldn't have been true");
            assert(manifest.components.has_value() || !"At least one component must be declared");

            for (auto &component : *manifest.components) {
                if (component.slug == *manifest.singleApp) {
                    InitializeReactRootView(reactInstance_.ReactHost(), ReactRootView(), component);
                    break;
                }
            }
        }

        InitializeReactMenu(std::move(manifest));
    } else {
        InitializeReactMenu(std::nullopt);
    }
}

IAsyncAction MainPage::LoadFromDevServer(IInspectable const &, RoutedEventArgs)
{
    bool const devServerIsRunning = co_await ::ReactTestApp::IsDevServerRunning();
    if (!devServerIsRunning) {
        auto const message =
            L"Cannot connect to your development server. Please make sure that it is running and "
            L"try again.";
        MessageDialog(message).ShowAsync();
        co_return;
    }

    LoadJSBundleFrom(JSBundleSource::DevServer);
}

void MainPage::LoadFromJSBundle(IInspectable const &, RoutedEventArgs)
{
    if (!LoadJSBundleFrom(JSBundleSource::Embedded)) {
        std::wstring message{
            L"No JavaScript bundle with one of the following names was found in the app:\n\n"};
        for (auto &&name : ::ReactTestApp::JSBundleNames) {
            message += L"    \u2022 " + name + L".bundle\n";
        }
        message +=
            L"\nPlease make sure the bundle has been built, is appropriately named, and that it "
            L"has been added to 'app.json'. You may have to run 'install-windows-test-app' again "
            L"to update the project files.\n"
            L"\n"
            L"If you meant to use a development server, please make sure it is running.";
        MessageDialog(message).ShowAsync();
    }
}

void MainPage::ToggleRememberLastComponent(IInspectable const &sender, RoutedEventArgs)
{
    auto item = sender.as<ToggleMenuFlyoutItem>();
    Session::ShouldRememberLastComponent(item.IsChecked());
}

void MainPage::ConfigureBundler(IInspectable const &, RoutedEventArgs)
{
    auto [host, port] = reactInstance_.BundlerAddress();
    if (!host.empty()) {
        BundlerHost().Text(host);
    }
    if (port != 0) {
        BundlerPort().Value(port);
    }

    ConfigureBundlerDialog().ShowAsync();
}

void MainPage::ConfigureBundlerDialog_Apply(IInspectable const &,
                                            ContentDialogButtonClickEventArgs const)
{
    auto const rawValue = BundlerPort().Value();
    auto const port = std::isnan(rawValue) ? 0 : static_cast<int>(rawValue);
    reactInstance_.BundlerAddress(BundlerHost().Text(), port);
}

void MainPage::ConfigureBundlerDialog_Reset(IInspectable const &,
                                            ContentDialogButtonClickEventArgs const)
{
    reactInstance_.BundlerAddress({}, 0);
}

void MainPage::Reload(IInspectable const &, RoutedEventArgs)
{
    reactInstance_.Reload();
}

void MainPage::ToggleBreakOnFirstLine(IInspectable const &sender, RoutedEventArgs)
{
    auto const breakOnFirstLine = !reactInstance_.BreakOnFirstLine();
    SetBreakOnFirstLineMenuItem(sender, breakOnFirstLine);
    reactInstance_.BreakOnFirstLine(breakOnFirstLine);
}

void MainPage::ToggleDirectDebugger(IInspectable const &sender, RoutedEventArgs)
{
    auto const useDirectDebugger = !reactInstance_.UseDirectDebugger();
    SetDirectDebuggerMenuItem(sender, useDirectDebugger);
    reactInstance_.UseDirectDebugger(useDirectDebugger);
}

void MainPage::ToggleFastRefresh(IInspectable const &sender, RoutedEventArgs)
{
    auto const useFastRefresh = !reactInstance_.UseFastRefresh();
    SetFastRefreshMenuItem(sender, useFastRefresh);
    reactInstance_.UseFastRefresh(useFastRefresh);
}

void MainPage::ToggleInspector(IInspectable const &, RoutedEventArgs)
{
    reactInstance_.ToggleElementInspector();
}

void MainPage::ToggleWebDebugger(IInspectable const &sender, RoutedEventArgs)
{
    auto const useWebDebugger = !reactInstance_.UseWebDebugger();
    SetWebDebuggerMenuItem(sender, useWebDebugger);
    reactInstance_.UseWebDebugger(useWebDebugger);
}

IAsyncAction MainPage::OnNavigatedTo(NavigationEventArgs const &e)
{
    Base::OnNavigatedTo(e);

    bool const devServerIsRunning = co_await ::ReactTestApp::IsDevServerRunning();
    devServerIsRunning ? LoadFromDevServer({}, {}) : LoadFromJSBundle({}, {});
}

bool MainPage::LoadJSBundleFrom(JSBundleSource source)
{
    if (!reactInstance_.LoadJSBundleFrom(source)) {
        return false;
    }

    InitializeDebugMenu();
    return true;
}

void MainPage::LoadReactComponent(Component const &component)
{
    auto title = to_hstring(component.displayName.value_or(component.appKey));
    auto &&presentationStyle = component.presentationStyle.value_or("");
    if (presentationStyle == "modal") {
        InitializeReactRootView(reactInstance_.ReactHost(), DialogReactRootView(), component);
        ContentDialog().Title(box_value(title));
        ContentDialog().ShowAsync();
    } else {
        InitializeReactRootView(reactInstance_.ReactHost(), ReactRootView(), component);
        AppTitle().Text(title);
    }
}

void MainPage::InitializeDebugMenu()
{
    if constexpr (kDebug || !kSingleAppMode) {
        if (!reactInstance_.UseCustomDeveloperMenu()) {
            return;
        }

        SetWebDebuggerMenuItem(WebDebuggerMenuItem(), reactInstance_.UseWebDebugger());
        WebDebuggerMenuItem().IsEnabled(reactInstance_.IsWebDebuggerAvailable());

        SetDirectDebuggerMenuItem(DirectDebuggingMenuItem(), reactInstance_.UseDirectDebugger());
        SetBreakOnFirstLineMenuItem(BreakOnFirstLineMenuItem(), reactInstance_.BreakOnFirstLine());

        SetFastRefreshMenuItem(FastRefreshMenuItem(), reactInstance_.UseFastRefresh());
        FastRefreshMenuItem().IsEnabled(reactInstance_.IsFastRefreshAvailable());

        if constexpr (ReactInstance::Version < 6300) {
            ConfigureBundlerMenuItem().Visibility(Visibility::Collapsed);
        }

        DebugMenuBarItem().IsEnabled(true);
    }
}

void MainPage::InitializeReactMenu(std::optional<::ReactTestApp::Manifest> manifest)
{
    if constexpr (kDebug || !kSingleAppMode) {
        AppMenuBar().Visibility(Visibility::Visible);

        RememberLastComponentMenuItem().IsChecked(Session::ShouldRememberLastComponent());

        auto menuItems = ReactMenuBarItem().Items();
        if (!manifest.has_value()) {
            MenuFlyoutItem newMenuItem;
            newMenuItem.Text(L"Couldn't parse 'app.json'");
            newMenuItem.IsEnabled(false);
            menuItems.Append(newMenuItem);
            return;
        }

        if constexpr (!kSingleAppMode) {
            auto &components = manifest->components;
            if (!components.has_value() || components->empty()) {
                reactInstance_.SetComponentsRegisteredDelegate(
                    [this](std::vector<std::string> const &appKeys) {
                        std::vector<Component> components;
                        components.reserve(appKeys.size());
                        std::transform(std::begin(appKeys),
                                       std::end(appKeys),
                                       std::back_inserter(components),
                                       [](std::string const &appKey) { return Component{appKey}; });
                        OnComponentsRegistered(std::move(components));
                        PresentReactMenu();
                    });
            } else {
                OnComponentsRegistered(std::move(components.value()));
                reactInstance_.SetComponentsRegisteredDelegate(
                    [this](std::vector<std::string> const &) { PresentReactMenu(); });
            }
        }
    }
}

void MainPage::InitializeTitleBar()
{
    auto coreTitleBar = CoreApplication::GetCurrentView().TitleBar();
    coreTitleBar.LayoutMetricsChanged({this, &MainPage::OnCoreTitleBarLayoutMetricsChanged});
    coreTitleBar.ExtendViewIntoTitleBar(true);

    // Set close, minimize and maximize icons background to transparent
    auto viewTitleBar = ApplicationView::GetForCurrentView().TitleBar();
    viewTitleBar.ButtonBackgroundColor(Colors::Transparent());
    viewTitleBar.ButtonInactiveBackgroundColor(Colors::Transparent());

    Window::Current().SetTitleBar(AppTitleBar());
}

bool MainPage::IsPresenting()
{
    return !ReactRootView().ComponentName().empty();
}

void MainPage::OnComponentsRegistered(std::vector<Component> components)
{
    auto coreDispatcher = CoreApplication::MainView().CoreWindow().Dispatcher();
    if (!coreDispatcher.HasThreadAccess()) {
        coreDispatcher.RunAsync(CoreDispatcherPriority::Normal,
                                [this, components = std::move(components)]() {
                                    OnComponentsRegistered(std::move(components));
                                });
        return;
    }

    if (IsLoaded()) {
        // When components are retrieved directly from `AppRegistry`, don't use
        // session data as an invalid index may be stored.
        if (components.size() == 1) {
            coreDispatcher.RunAsync(
                CoreDispatcherPriority::Normal,
                [this, component = components[0]]() { LoadReactComponent(component); });
        }
    } else {
        // If only one component is present, load it right away. Otherwise,
        // check whether we can reopen a component from previous session.
        auto index =
            components.size() == 1 ? 0 : Session::GetLastOpenedComponent(manifestChecksum_);
        if (index.has_value()) {
            Loaded([this, component = components[index.value()]](IInspectable const &,
                                                                 RoutedEventArgs const &) {
                LoadReactComponent(component);
            });
        }
    }

    auto menuItems = ReactMenuBarItem().Items();
    for (int i = menuItems.Size() - 1; i >= 0; --i) {
        auto item = menuItems.GetAt(i);
        if (item.try_as<MenuFlyoutSeparator>()) {
            break;
        }

        menuItems.RemoveAtEnd();
    }

    auto keyboardAcceleratorKey = VirtualKey::Number1;
    for (int i = 0; i < static_cast<int>(components.size()); ++i) {
        auto &component = components[i];

        MenuFlyoutItem newMenuItem;
        newMenuItem.Text(to_hstring(component.displayName.value_or(component.appKey)));
        newMenuItem.Click(
            [this, component = std::move(component), i](IInspectable const &, RoutedEventArgs) {
                LoadReactComponent(component);
                Session::StoreComponent(i, manifestChecksum_);
            });

        // Add keyboard accelerator for first nine (1-9) components
        if (keyboardAcceleratorKey <= VirtualKey::Number9) {
            auto const num = std::underlying_type_t<VirtualKey>(keyboardAcceleratorKey) -
                             std::underlying_type_t<VirtualKey>(VirtualKey::Number0);
            newMenuItem.AccessKey(to_hstring(num));

            KeyboardAccelerator keyboardAccelerator;
            keyboardAccelerator.Modifiers(VirtualKeyModifiers::Control |
                                          VirtualKeyModifiers::Shift);
            keyboardAccelerator.Key(keyboardAcceleratorKey);

            newMenuItem.KeyboardAccelerators().Append(keyboardAccelerator);

            keyboardAcceleratorKey =
                static_cast<VirtualKey>(static_cast<int32_t>(keyboardAcceleratorKey) + 1);
        }

        menuItems.Append(newMenuItem);
    }

    RememberLastComponentMenuItem().IsEnabled(components.size() > 1);
}

// Adjust height of custom title bar to match close, minimize and maximize icons
void MainPage::OnCoreTitleBarLayoutMetricsChanged(CoreApplicationViewTitleBar const &sender,
                                                  IInspectable const &)
{
    AppTitleBar().Height(sender.Height());
    AppMenuBar().Height(sender.Height());
}

void MainPage::PresentReactMenu()
{
    CoreApplication::MainView().CoreWindow().Dispatcher().RunAsync(
        CoreDispatcherPriority::Low, [this]() {
            if (!IsPresenting()) {
                MenuBarItemAutomationPeer(ReactMenuBarItem()).Invoke();
            }
        });
}
