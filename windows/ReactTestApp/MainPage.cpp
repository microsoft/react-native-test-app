#include "pch.h"

#include "MainPage.h"

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"
#include "Manifest.h"

using winrt::Windows::Foundation::IAsyncAction;
using winrt::Windows::UI::Xaml::RoutedEventArgs;
using winrt::Windows::UI::Xaml::Controls::MenuFlyout;
using winrt::Windows::UI::Xaml::Controls::MenuFlyoutItem;
using winrt::Windows::UI::Xaml::Navigation::NavigationEventArgs;

namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();

        auto menuItems = MenuFlyout().Items();
        std::optional<::ReactTestApp::Manifest> manifest = ::ReactTestApp::GetManifest();
        if (!manifest.has_value()) {
            MenuFlyoutItem newMenuItem;
            newMenuItem.Text(L"Couldn't parse app.json");
            newMenuItem.IsEnabled(false);
            menuItems.Append(newMenuItem);
        } else {
            auto &components = manifest.value().components;
            for (auto &&c : components) {
                hstring componentDisplayName = to_hstring(c.displayName.value_or(c.appKey));
                hstring appKey = to_hstring(c.appKey);
                ReactTestApp::ComponentViewModel newComponent =
                    winrt::make<ComponentViewModel>(appKey, componentDisplayName);

                MenuFlyoutItem newMenuItem;
                newMenuItem.CommandParameter(newComponent);
                newMenuItem.Text(newComponent.DisplayName());
                newMenuItem.Click({this, &MainPage::SetReactComponentName});
                menuItems.Append(newMenuItem);
            }

            // If only one component is present load it automatically
            if (components.size() == 1) {
                ReactRootView().ComponentName(to_hstring(components.at(0).appKey));
            }

            ReactRootView().ReactNativeHost(reactInstance_.ReactHost());
        }
    }

    IAsyncAction MainPage::OnNavigatedTo(NavigationEventArgs const &e)
    {
        Base::OnNavigatedTo(e);
        bool devServerIsRunning = co_await ::ReactTestApp::IsDevServerRunning();
        if (devServerIsRunning) {
            reactInstance_.LoadJSBundleFrom(::ReactTestApp::JSBundleSource::DevServer);
        } else {
            reactInstance_.LoadJSBundleFrom(::ReactTestApp::JSBundleSource::Embedded);
        }
    }

    void MainPage::LoadFromJSBundle(IInspectable const &, RoutedEventArgs)
    {
        reactInstance_.LoadJSBundleFrom(::ReactTestApp::JSBundleSource::Embedded);
    }

    void MainPage::LoadFromDevServer(IInspectable const &, RoutedEventArgs)
    {
        reactInstance_.LoadJSBundleFrom(::ReactTestApp::JSBundleSource::DevServer);
    }

    void MainPage::SetReactComponentName(IInspectable const &sender, RoutedEventArgs)
    {
        auto s = sender.as<MenuFlyoutItem>().CommandParameter();
        ReactRootView().ComponentName(s.as<ComponentViewModel>()->AppKey());
    }

}  // namespace winrt::ReactTestApp::implementation
