#pragma once

#include <any>
#include <map>
#include <optional>
#include <string>

#include "MainPage.g.h"
#include "Manifest.h"
#include "ReactInstance.h"

namespace winrt::ReactTestApp::implementation
{
    struct MainPage : MainPageT<MainPage> {
    public:
        MainPage();

        void LoadFromDevServer(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs);
        void LoadFromJSBundle(Windows::Foundation::IInspectable const &,
                              Windows::UI::Xaml::RoutedEventArgs);
        void OpenDebugMenu(Windows::Foundation::IInspectable const &,
                              Windows::UI::Xaml::RoutedEventArgs);

        Windows::Foundation::IAsyncAction
        OnNavigatedTo(Windows::UI::Xaml::Navigation::NavigationEventArgs const &e);

        void OnItemClick(Windows::Foundation::IInspectable const &sender,
                         Windows::UI::Xaml::Controls::ItemClickEventArgs e);

    private:
        using Base = MainPageT;

        ::ReactTestApp::ReactInstance reactInstance_;

        void LoadReactComponent(::ReactTestApp::Component const &component);

        void SetUpTitleBar();

        void OnCoreTitleBarLayoutMetricsChanged(
            Windows::ApplicationModel::Core::CoreApplicationViewTitleBar const &sender,
            Windows::Foundation::IInspectable const &);
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
