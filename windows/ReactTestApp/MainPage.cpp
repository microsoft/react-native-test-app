#include "pch.h"

#include "MainPage.h"

#include <winrt/Windows.ApplicationModel.Core.h>
#include <winrt/Windows.UI.ViewManagement.h>

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"

using winrt::Windows::ApplicationModel::Core::CoreApplication;
using winrt::Windows::Foundation::IAsyncAction;
using winrt::Windows::UI::ViewManagement::ApplicationView;
using winrt::Windows::UI::Xaml::RoutedEventArgs;
using winrt::Windows::UI::Xaml::Style;
using winrt::Windows::UI::Xaml::Window;
using winrt::Windows::UI::Xaml::Controls::Button;
using winrt::Windows::UI::Xaml::Navigation::NavigationEventArgs;

namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();

        SetUpTitleBar();

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
                Button newMenuItem = GetComponentMenuButton(c);
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

    Button MainPage::GetComponentMenuButton(::ReactTestApp::Component &component)
    {
        hstring componentDisplayName = to_hstring(component.displayName.value_or(component.appKey));
        hstring appKey = to_hstring(component.appKey);
        ReactTestApp::ComponentViewModel newComponent =
            winrt::make<ComponentViewModel>(appKey, componentDisplayName);

        Button newMenuItem;
        auto style = this->Resources().Lookup(winrt::box_value(L"ReactMenuButton")).as<::Style>();
        newMenuItem.Style(style);
        newMenuItem.Content(winrt::box_value(newComponent.DisplayName()));
        newMenuItem.CommandParameter(newComponent);
        newMenuItem.Click({this, &MainPage::SetReactComponentName});
        return newMenuItem;
    }

    void MainPage::SetUpTitleBar()
    {
        // Set close, minimize and maximize icons background to transparent
        auto appView = ApplicationView::GetForCurrentView().TitleBar();
        appView.ButtonBackgroundColor(winrt::Windows::UI::Colors::Transparent());
        appView.BackgroundColor(winrt::Windows::UI::Colors::Transparent());

        auto coreTitleBar = CoreApplication::GetCurrentView().TitleBar();
        coreTitleBar.LayoutMetricsChanged({this, &MainPage::CoreTitleBarLayoutMetricsChanged});
        coreTitleBar.ExtendViewIntoTitleBar(true);
        Window::Current().SetTitleBar(BackgroundElement());
    }

    // Adjust height of custom title bar to match close, minimize and maximize icons
    void MainPage::CoreTitleBarLayoutMetricsChanged(
        winrt::Windows::ApplicationModel::Core::CoreApplicationViewTitleBar const &sender,
        Windows::Foundation::IInspectable const &)
    {
        TitleBar().Height(sender.Height());
    }

}  // namespace winrt::ReactTestApp::implementation
