#include "pch.h"

#include "MainPage.h"

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"
#include "Manifest.h"

using namespace winrt::Microsoft::ReactNative;
using namespace winrt::Windows::UI::Xaml::Controls;

namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();
        SetComponents();
        InitReact();
    }

    void MainPage::SetComponents()
    {
        auto menuItems = MenuFlyout().Items();
        for (auto &&c : ::ReactTestApp::GetManifest().components) {
            hstring componentDisplayName = to_hstring(c.displayName.value_or(c.appKey));
            hstring componentName = to_hstring(c.appKey);
            ReactTestApp::ComponentViewModel newComponent =
                winrt::make<ComponentViewModel>(componentName, componentDisplayName);
            m_components.push_back(newComponent);

            MenuFlyoutItem newMenuItem = MenuFlyoutItem();
            newMenuItem.CommandParameter(newComponent);
            newMenuItem.Text(newComponent.DisplayName());
            newMenuItem.Click({this, &MainPage::SetReactComponentName});
            menuItems.Append(newMenuItem);
        }
    }

    void MainPage::InitReact()
    {
        m_reactNativeHost = ReactNativeHost();

        // TODO fallback to JS bundle
        LoadFromJSBundle();

        // If only one component is present load it automatically
        if (m_components.size() == 1) {
            ReactRootView().ComponentName(m_components.at(0).AppKey());
        }

        ReactRootView().ReactNativeHost(m_reactNativeHost);
    }

    void MainPage::LoadFromJSBundle()
    {
        m_reactNativeHost.InstanceSettings().UseLiveReload(false);
        m_reactNativeHost.InstanceSettings().UseWebDebugger(false);
        m_reactNativeHost.InstanceSettings().UseFastRefresh(false);
        m_reactNativeHost.InstanceSettings().JavaScriptBundleFile(L"main.windows");  // TODO
        m_reactNativeHost.ReloadInstance();
    }

    void MainPage::LoadFromDevServer()
    {
        m_reactNativeHost.InstanceSettings().UseLiveReload(true);
        m_reactNativeHost.InstanceSettings().UseWebDebugger(true);
        m_reactNativeHost.InstanceSettings().UseFastRefresh(true);
        m_reactNativeHost.InstanceSettings().JavaScriptMainModuleName(L"index.windows");  // TODO
        m_reactNativeHost.ReloadInstance();
    }

    void MainPage::LoadFromJSBundle(Windows::Foundation::IInspectable const &,
                                    Windows::UI::Xaml::RoutedEventArgs)
    {
        LoadFromJSBundle();
    }

    void MainPage::LoadFromDevServer(Windows::Foundation::IInspectable const &,
                                     Windows::UI::Xaml::RoutedEventArgs)
    {
        LoadFromDevServer();
    }

    void MainPage::SetReactComponentName(Windows::Foundation::IInspectable const &sender,
                                         Windows::UI::Xaml::RoutedEventArgs e)
    {
        auto s = sender.as<winrt::Windows::UI::Xaml::Controls::MenuFlyoutItem>().CommandParameter();
        ReactRootView().ComponentName(s.as<ComponentViewModel>()->AppKey());
    }
}  // namespace winrt::ReactTestApp::implementation
