#pragma once

#include "MainPage.g.h"
#include "Manifest.h"
#include "ReactInstance.h"

namespace winrt::ReactTestApp::implementation
{
    struct MainPage : MainPageT<MainPage> {
    public:
        MainPage();
        void LoadFromJSBundle(Windows::Foundation::IInspectable const &,
                              Windows::UI::Xaml::RoutedEventArgs);
        void LoadFromDevServer(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs);
        void MainPage::OpenReactMenu(Windows::Foundation::IInspectable const &,
                                     winrt::Windows::UI::Xaml::RoutedEventArgs);
        Windows::Foundation::IAsyncAction
        OnNavigatedTo(Windows::UI::Xaml::Navigation::NavigationEventArgs const &e);
        using Base = MainPageT;

        void OnItemClick(Windows::Foundation::IInspectable const &sender,
                         Windows::UI::Xaml::Controls::ItemClickEventArgs e);

    private:
        ::ReactTestApp::ReactInstance reactInstance_;

        void SetReactComponentName(Windows::Foundation::IInspectable const &,
                                   Windows::UI::Xaml::RoutedEventArgs);
        Windows::UI::Xaml::Controls::Button
        GetComponentMenuButton(::ReactTestApp::Component &component);
        void CoreTitleBarLayoutMetricsChanged(
            winrt::Windows::ApplicationModel::Core::CoreApplicationViewTitleBar const &sender,
            Windows::Foundation::IInspectable const &);
        void SetUpTitleBar();
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
