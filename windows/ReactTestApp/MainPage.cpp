#include "pch.h"

#include "MainPage.h"

#include <winrt/Windows.ApplicationModel.Core.h>
#include <winrt/Windows.UI.ViewManagement.h>

#include "MainPage.g.cpp"

using winrt::Microsoft::ReactNative::IJSValueWriter;
using winrt::Windows::ApplicationModel::Core::CoreApplication;
using winrt::Windows::ApplicationModel::Core::CoreApplicationViewTitleBar;
using winrt::Windows::Foundation::IAsyncAction;
using winrt::Windows::UI::Colors;
using winrt::Windows::UI::ViewManagement::ApplicationView;
using winrt::Windows::UI::Xaml::RoutedEventArgs;
using winrt::Windows::UI::Xaml::Window;
using winrt::Windows::UI::Xaml::Controls::MenuFlyout;
using winrt::Windows::UI::Xaml::Controls::MenuFlyoutItem;
using winrt::Windows::UI::Xaml::Navigation::NavigationEventArgs;

namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();

        SetUpTitleBar();

        auto menuItems = MenuFlyout().Items();
        std::optional<::ReactTestApp::Manifest> manifest = ::ReactTestApp::GetManifest();
        if (!manifest.has_value()) {
            MenuFlyoutItem newMenuItem;
            newMenuItem.Text(L"Couldn't parse app.json");
            newMenuItem.IsEnabled(false);
            menuItems.Append(newMenuItem);
        } else {
            AppTitle().Text(to_hstring(manifest.value().displayName));

            auto &components = manifest.value().components;
            for (auto &&c : components) {
                MenuFlyoutItem newMenuItem = MakeComponentMenuButton(c);
                menuItems.Append(newMenuItem);
            }

            ReactRootView().ReactNativeHost(reactInstance_.ReactHost());

            // If only one component is present load it automatically
            if (components.size() == 1) {
                LoadReactComponent(components.at(0));
            }
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

    void MainPage::LoadReactComponent(::ReactTestApp::Component const &component)
    {
        AppTitle().Text(to_hstring(component.displayName.value_or(component.appKey)));

        ReactRootView().ComponentName(to_hstring(component.appKey));
        SetInitialProperties(component.initialProperties);
    }

    void MainPage::OnReactMenuClick(IInspectable const &, RoutedEventArgs)
    {
        ReactMenuButton().Flyout().ShowAt(ReactMenuButton());
    }

    MenuFlyoutItem MainPage::MakeComponentMenuButton(::ReactTestApp::Component const &component)
    {
        hstring componentDisplayName = to_hstring(component.displayName.value_or(component.appKey));

        MenuFlyoutItem newMenuItem;
        newMenuItem.Text(componentDisplayName);
        newMenuItem.Click([this, component](IInspectable const &, RoutedEventArgs) {
            LoadReactComponent(component);
        });
        return newMenuItem;
    }

    void MainPage::SetUpTitleBar()
    {
        // Set close, minimize and maximize icons background to transparent
        auto appView = ApplicationView::GetForCurrentView().TitleBar();
        appView.ButtonBackgroundColor(Colors::Transparent());
        appView.BackgroundColor(Colors::Transparent());

        auto coreTitleBar = CoreApplication::GetCurrentView().TitleBar();
        coreTitleBar.LayoutMetricsChanged({this, &MainPage::OnCoreTitleBarLayoutMetricsChanged});
        coreTitleBar.ExtendViewIntoTitleBar(true);
        Window::Current().SetTitleBar(BackgroundElement());
    }

    // Adjust height of custom title bar to match close, minimize and maximize icons
    void MainPage::OnCoreTitleBarLayoutMetricsChanged(CoreApplicationViewTitleBar const &sender,
                                                      IInspectable const &)
    {
        TitleBar().Height(sender.Height());
    }

    void MainPage::SetInitialProperties(
        std::optional<std::map<std::string, std::any>> const &initialProps)
    {
        ReactRootView().InitialProps([&initialProps](IJSValueWriter const &writer) {
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

    void WritePropertyValue(std::any const &propertyValue, IJSValueWriter const &writer)
    {
        if (propertyValue.type() == typeid(boolean)) {
            writer.WriteBoolean(std::any_cast<boolean>(propertyValue));
        } else if (propertyValue.type() == typeid(std::int64_t)) {
            writer.WriteInt64(std::any_cast<std::int64_t>(propertyValue));
        } else if (propertyValue.type() == typeid(std::uint64_t)) {
            writer.WriteInt64(std::any_cast<std::uint64_t>(propertyValue));
        } else if (propertyValue.type() == typeid(double)) {
            writer.WriteDouble(std::any_cast<double>(propertyValue));
        } else if (propertyValue.type() == typeid(std::nullopt)) {
            writer.WriteNull();
        } else if (propertyValue.type() == typeid(std::string)) {
            writer.WriteString(to_hstring(std::any_cast<std::string>(propertyValue)));
        } else if (propertyValue.type() == typeid(std::vector<std::any>)) {
            writer.WriteArrayBegin();
            for (auto &&e : std::any_cast<std::vector<std::any>>(propertyValue)) {
                WritePropertyValue(e, writer);
            }
            writer.WriteArrayEnd();
        } else if (propertyValue.type() == typeid(std::map<std::string, std::any>)) {
            writer.WriteObjectBegin();
            for (auto &&e : std::any_cast<std::map<std::string, std::any>>(propertyValue)) {
                writer.WritePropertyName(to_hstring(e.first));
                WritePropertyValue(e.second, writer);
            }
            writer.WriteObjectEnd();
        } else {
            assert(false);
        }
    }

}  // namespace winrt::ReactTestApp::implementation
