//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include "pch.h"

#include "MainPage.h"

#include <winrt/Windows.ApplicationModel.Core.h>
#include <winrt/Windows.UI.Popups.h>
#include <winrt/Windows.UI.ViewManagement.h>

#include "MainPage.g.cpp"
#include "Session.h"

using ReactTestApp::JSBundleSource;
using ReactTestApp::Session;
using winrt::Microsoft::ReactNative::IJSValueWriter;
using winrt::ReactTestApp::implementation::MainPage;
using winrt::Windows::ApplicationModel::Core::CoreApplication;
using winrt::Windows::ApplicationModel::Core::CoreApplicationViewTitleBar;
using winrt::Windows::Foundation::IAsyncAction;
using winrt::Windows::Foundation::IInspectable;
using winrt::Windows::System::VirtualKey;
using winrt::Windows::System::VirtualKeyModifiers;
using winrt::Windows::UI::Colors;
using winrt::Windows::UI::Popups::MessageDialog;
using winrt::Windows::UI::ViewManagement::ApplicationView;
using winrt::Windows::UI::Xaml::RoutedEventArgs;
using winrt::Windows::UI::Xaml::Window;
using winrt::Windows::UI::Xaml::Controls::MenuFlyoutItem;
using winrt::Windows::UI::Xaml::Controls::ToggleMenuFlyoutItem;
using winrt::Windows::UI::Xaml::Input::KeyboardAccelerator;
using winrt::Windows::UI::Xaml::Navigation::NavigationEventArgs;

namespace
{
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

    void InitializeReactRootView(winrt::Microsoft::ReactNative::ReactRootView reactRootView,
                                 ReactTestApp::Component const &component)
    {
        reactRootView.ComponentName(winrt::to_hstring(component.appKey));
        reactRootView.InitialProps(
            [&initialProps = component.initialProperties](IJSValueWriter const &writer) {
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
    InitializeReactMenu();
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

void MainPage::Reload(Windows::Foundation::IInspectable const &, Windows::UI::Xaml::RoutedEventArgs)
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

void MainPage::ToggleInspector(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs)
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

void MainPage::LoadReactComponent(::ReactTestApp::Component const &component)
{
    auto title = to_hstring(component.displayName.value_or(component.appKey));
    auto &&presentationStyle = component.presentationStyle.value_or("");
    if (presentationStyle == "modal") {
        if (DialogReactRootView().ReactNativeHost() == nullptr) {
            DialogReactRootView().ReactNativeHost(reactInstance_.ReactHost());
        }

        InitializeReactRootView(DialogReactRootView(), component);
        ContentDialog().Title(winrt::box_value(title));
        ContentDialog().ShowAsync();
    } else {
        if (ReactRootView().ReactNativeHost() == nullptr) {
            ReactRootView().ReactNativeHost(reactInstance_.ReactHost());
        }

        InitializeReactRootView(ReactRootView(), component);
        AppTitle().Text(title);
    }
}

void MainPage::InitializeDebugMenu()
{
    if (!reactInstance_.UseCustomDeveloperMenu()) {
        return;
    }

    SetWebDebuggerMenuItem(WebDebuggerMenuItem(), reactInstance_.UseWebDebugger());
    WebDebuggerMenuItem().IsEnabled(reactInstance_.isWebDebuggerAvailable());

    SetDirectDebuggerMenuItem(DirectDebuggingMenuItem(), reactInstance_.UseDirectDebugger());
    SetBreakOnFirstLineMenuItem(BreakOnFirstLineMenuItem(), reactInstance_.BreakOnFirstLine());

    SetFastRefreshMenuItem(FastRefreshMenuItem(), reactInstance_.UseFastRefresh());
    FastRefreshMenuItem().IsEnabled(reactInstance_.isFastRefreshAvailable());

    DebugMenuBarItem().IsEnabled(true);
}

void MainPage::InitializeReactMenu()
{
    RememberLastComponentMenuItem().IsChecked(Session::ShouldRememberLastComponent());

    auto result = ::ReactTestApp::GetManifest("app.json");
    auto menuItems = ReactMenuBarItem().Items();
    if (!result.has_value()) {
        MenuFlyoutItem newMenuItem;
        newMenuItem.Text(L"Couldn't parse 'app.json'");
        newMenuItem.IsEnabled(false);
        menuItems.Append(newMenuItem);
        return;
    }

    auto &&[manifest, checksum] = result.value();
    manifestChecksum_ = std::move(checksum);

    // If only one component is present load, it automatically. Otherwise, check
    // whether we can reopen a component from previous session.
    auto &components = manifest.components;
    auto index = components.size() == 1 ? 0 : Session::GetLastOpenedComponent(manifestChecksum_);
    if (index.has_value()) {
        Loaded([this, component = components[index.value()]](IInspectable const &,
                                                             RoutedEventArgs const &) {
            LoadReactComponent(component);
        });
    } else {
        AppTitle().Text(to_hstring(manifest.displayName));
    }

    auto keyboardAcceleratorKey = VirtualKey::Number1;
    for (int i = 0; i < static_cast<int>(components.size()); ++i) {
        auto &&component = components[i];

        MenuFlyoutItem newMenuItem;
        newMenuItem.Text(winrt::to_hstring(component.displayName.value_or(component.appKey)));
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

// Adjust height of custom title bar to match close, minimize and maximize icons
void MainPage::OnCoreTitleBarLayoutMetricsChanged(CoreApplicationViewTitleBar const &sender,
                                                  IInspectable const &)
{
    AppTitleBar().Height(sender.Height());
    AppMenuBar().Height(sender.Height());
}
