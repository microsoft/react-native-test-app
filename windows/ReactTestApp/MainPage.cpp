#include "pch.h"

#include "MainPage.h"

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"
#include "Manifest.h"

using namespace winrt::Windows::UI::Xaml::Controls;

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
            // TODO fallback to JS bundle
            reactInstance_.LoadJSBundleFrom(::ReactTestApp::JSBundleSource::Embedded);

            ReactRootView().ReactNativeHost(reactInstance_.ReactHost());
        }
    }

    void MainPage::LoadFromJSBundle(Windows::Foundation::IInspectable const &,
                                    Windows::UI::Xaml::RoutedEventArgs)
    {
        reactInstance_.LoadJSBundleFrom(::ReactTestApp::JSBundleSource::Embedded);
    }

    void MainPage::LoadFromDevServer(Windows::Foundation::IInspectable const &,
                                     Windows::UI::Xaml::RoutedEventArgs)
    {
        reactInstance_.LoadJSBundleFrom(::ReactTestApp::JSBundleSource::DevServer);
    }

    void MainPage::SetReactComponentName(Windows::Foundation::IInspectable const &sender,
                                         Windows::UI::Xaml::RoutedEventArgs)
    {
        auto s = sender.as<MenuFlyoutItem>().CommandParameter();
        ReactRootView().ComponentName(s.as<ComponentViewModel>()->AppKey());
    }
}  // namespace winrt::ReactTestApp::implementation
