#include "pch.h"

#include "MainPage.h"

#include <winrt/Windows.ApplicationModel.Core.h>

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"
#include "Manifest.h"
using winrt::Windows::ApplicationModel::Core::CoreApplication;
using winrt::Windows::Foundation::IAsyncAction;
using winrt::Windows::UI::Xaml::RoutedEventArgs;
using winrt::Windows::UI::Xaml::Window;
using winrt::Windows::UI::Xaml::Controls::Button;
using winrt::Windows::UI::Xaml::Input::TappedRoutedEventArgs;
using winrt::Windows::UI::Xaml::Navigation::NavigationEventArgs;
using winrt::Windows::UI::Xaml::Style;

namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();

        auto coreTitleBar = CoreApplication::GetCurrentView().TitleBar();
        coreTitleBar.ExtendViewIntoTitleBar(true);
        Window::Current().SetTitleBar(BackgroundElement());

        auto menuItems = ReactMenu().Children();
        std::optional<::ReactTestApp::Manifest> manifest = ::ReactTestApp::GetManifest();
        if (!manifest.has_value()) {
            Button newMenuItem;
            newMenuItem.Content(winrt::box_value(L"Couldn't parse app.json"));
            newMenuItem.IsEnabled(false);
            menuItems.Append(newMenuItem);
        } else {
            AppTitle().Text(to_hstring(manifest.value().displayName));

            auto &components = manifest.value().components;
            for (auto &&c : components) {
                hstring componentDisplayName = to_hstring(c.displayName.value_or(c.appKey));
                hstring appKey = to_hstring(c.appKey);
                ReactTestApp::ComponentViewModel newComponent =
                    winrt::make<ComponentViewModel>(appKey, componentDisplayName);

                Button newMenuItem;
                auto style = this->Resources()
                                 .Lookup(winrt::box_value(L"ReactMenuButton"))
                                 .as<::Style>();
                newMenuItem.Style(style);
                newMenuItem.Content(winrt::box_value(newComponent.DisplayName()));
                newMenuItem.CommandParameter(newComponent);
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
        auto s = sender.as<Button>().CommandParameter();
        ReactRootView().ComponentName(s.as<ComponentViewModel>()->AppKey());
    }

    void MainPage::OpenReactMenu(IInspectable const &, RoutedEventArgs)
    {
        ReactButton().Flyout().ShowAt(ReactButton());
    }

}  // namespace winrt::ReactTestApp::implementation
