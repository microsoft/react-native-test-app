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
        std::optional<::ReactTestApp::Manifest> manifest = ::ReactTestApp::GetManifest();
        if (!manifest.has_value()) {
            MenuFlyoutItem newMenuItem;
            newMenuItem.Text(L"Couldn't parse app.json");
            newMenuItem.IsEnabled(false);
            menuItems.Append(newMenuItem);
        } else {
            for (auto &&c : manifest.value().components) {
                hstring componentDisplayName = to_hstring(c.displayName.value_or(c.appKey));
                hstring componentName = to_hstring(c.appKey);
                ReactTestApp::ComponentViewModel newComponent =
                    winrt::make<ComponentViewModel>(componentName, componentDisplayName);
                m_components.push_back(newComponent);

                MenuFlyoutItem newMenuItem;
                newMenuItem.CommandParameter(newComponent);
                newMenuItem.Text(newComponent.DisplayName());
                newMenuItem.Click({this, &MainPage::SetReactComponentName});
                menuItems.Append(newMenuItem);
            }
        }
    }

    void MainPage::InitReact()
    {
        // TODO fallback to JS bundle
        LoadJSBundleFrom(JSBundleSource::Embedded);

        // If only one component is present load it automatically
        if (m_components.size() == 1) {
            ReactRootView().ComponentName(m_components.at(0).AppKey());
        }

        ReactRootView().ReactNativeHost(m_reactNativeHost);
    }

    void MainPage::LoadJSBundleFrom(JSBundleSource source)
    {
        m_reactNativeHost.InstanceSettings().UseLiveReload(source == JSBundleSource::DevServer);
        m_reactNativeHost.InstanceSettings().UseWebDebugger(source == JSBundleSource::DevServer);
        m_reactNativeHost.InstanceSettings().UseFastRefresh(source == JSBundleSource::DevServer);

        switch (source) {
            case JSBundleSource::DevServer:
                m_reactNativeHost.InstanceSettings().JavaScriptMainModuleName(L"index");
                m_reactNativeHost.InstanceSettings().JavaScriptBundleFile(L"");
                break;
            case JSBundleSource::Embedded:
                m_reactNativeHost.InstanceSettings().JavaScriptBundleFile(
                    L"main.windows.jsbundle");  // TODO
                break;
        }

        m_reactNativeHost.ReloadInstance();
    }

    void MainPage::LoadFromJSBundle(Windows::Foundation::IInspectable const &,
                                    Windows::UI::Xaml::RoutedEventArgs)
    {
        LoadJSBundleFrom(JSBundleSource::Embedded);
    }

    void MainPage::LoadFromDevServer(Windows::Foundation::IInspectable const &,
                                     Windows::UI::Xaml::RoutedEventArgs)
    {
        LoadJSBundleFrom(JSBundleSource::DevServer);
    }

    void MainPage::SetReactComponentName(Windows::Foundation::IInspectable const &sender,
                                         Windows::UI::Xaml::RoutedEventArgs)
    {
        auto s = sender.as<MenuFlyoutItem>().CommandParameter();
        ReactRootView().ComponentName(s.as<ComponentViewModel>()->AppKey());
    }

}  // namespace winrt::ReactTestApp::implementation
