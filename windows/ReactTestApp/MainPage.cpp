//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include "pch.h"

#include "MainPage.h"

#include <winrt/Windows.ApplicationModel.Core.h>
#include <winrt/Windows.UI.ViewManagement.h>

#include "MainPage.g.cpp"

using ReactTestApp::JSBundleSource;
using winrt::Microsoft::ReactNative::IJSValueWriter;
using winrt::ReactTestApp::implementation::MainPage;
using winrt::Windows::ApplicationModel::Core::CoreApplication;
using winrt::Windows::ApplicationModel::Core::CoreApplicationViewTitleBar;
using winrt::Windows::Foundation::IAsyncAction;
using winrt::Windows::Foundation::IInspectable;
using winrt::Windows::System::VirtualKey;
using winrt::Windows::System::VirtualKeyModifiers;
using winrt::Windows::UI::Colors;
using winrt::Windows::UI::ViewManagement::ApplicationView;
using winrt::Windows::UI::Xaml::RoutedEventArgs;
using winrt::Windows::UI::Xaml::Window;
using winrt::Windows::UI::Xaml::Controls::MenuFlyoutItem;
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
    InitializeDebugMenu();
}

void MainPage::LoadFromDevServer(IInspectable const &, RoutedEventArgs)
{
    reactInstance_.LoadJSBundleFrom(JSBundleSource::DevServer);
}

void MainPage::LoadFromJSBundle(IInspectable const &, RoutedEventArgs)
{
    reactInstance_.LoadJSBundleFrom(JSBundleSource::Embedded);
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

    bool devServerIsRunning = co_await ::ReactTestApp::IsDevServerRunning();
    reactInstance_.LoadJSBundleFrom(devServerIsRunning ? JSBundleSource::DevServer
                                                       : JSBundleSource::Embedded);
}

void MainPage::LoadReactComponent(::ReactTestApp::Component const &component)
{
    AppTitle().Text(to_hstring(component.displayName.value_or(component.appKey)));

    ReactRootView().ComponentName(to_hstring(component.appKey));
    ReactRootView().InitialProps(
        [&initialProps = component.initialProperties](IJSValueWriter const &writer) {
            if (initialProps.has_value()) {
                writer.WriteObjectBegin();
                for (auto &&property : initialProps.value()) {
                    auto &value = property.second;
                    writer.WritePropertyName(to_hstring(property.first));
                    WritePropertyValue(value, writer);
                }
                writer.WriteObjectEnd();
            }
        });
}

void MainPage::InitializeDebugMenu()
{
    if (!reactInstance_.UseCustomDeveloperMenu()) {
        return;
    }

    SetWebDebuggerMenuItem(WebDebuggerMenuItem(), reactInstance_.UseWebDebugger());
    SetDirectDebuggerMenuItem(DirectDebuggingMenuItem(), reactInstance_.UseDirectDebugger());
    SetBreakOnFirstLineMenuItem(BreakOnFirstLineMenuItem(), reactInstance_.BreakOnFirstLine());
    SetFastRefreshMenuItem(FastRefreshMenuItem(), reactInstance_.UseFastRefresh());
    DebugMenuBarItem().IsEnabled(true);
}

void MainPage::InitializeReactMenu()
{
    std::optional<::ReactTestApp::Manifest> manifest = ::ReactTestApp::GetManifest("app.json");
    auto menuItems = ReactMenuBarItem().Items();
    if (!manifest.has_value()) {
        MenuFlyoutItem newMenuItem;
        newMenuItem.Text(L"Couldn't parse 'app.json'");
        newMenuItem.IsEnabled(false);
        menuItems.Append(newMenuItem);
    } else {
        ReactRootView().ReactNativeHost(reactInstance_.ReactHost());

        // If only one component is present load it automatically
        auto &components = manifest.value().components;
        if (components.size() == 1) {
            LoadReactComponent(components.at(0));
        } else {
            AppTitle().Text(to_hstring(manifest.value().displayName));
        }

        auto keyboardAcceleratorKey = VirtualKey::Number1;
        for (auto &&c : components) {
            MenuFlyoutItem newMenuItem;

            newMenuItem.Text(winrt::to_hstring(c.displayName.value_or(c.appKey)));
            newMenuItem.Click(
                [this, component = std::move(c)](IInspectable const &, RoutedEventArgs) {
                    LoadReactComponent(component);
                });

            // Add keyboard accelerators for first nine (1-9) components
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
