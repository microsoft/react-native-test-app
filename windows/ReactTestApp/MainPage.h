#pragma once

#include <any>

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
        void OnReactMenuClick(Windows::Foundation::IInspectable const &,
                              Windows::UI::Xaml::RoutedEventArgs);
        Windows::Foundation::IAsyncAction
        OnNavigatedTo(Windows::UI::Xaml::Navigation::NavigationEventArgs const &e);
        using Base = MainPageT;

    private:
        ::ReactTestApp::ReactInstance reactInstance_;

        void LoadReactComponent(std::string const &appKey,
                                std::optional<std::map<std::string, std::any>> const &initialProps);
        void
        WriteInitialProperties(std::optional<std::map<std::string, std::any>> const &initialProps);
        Windows::UI::Xaml::Controls::MenuFlyoutItem
        MakeComponentMenuButton(::ReactTestApp::Component &component);
        void OnCoreTitleBarLayoutMetricsChanged(
            Windows::ApplicationModel::Core::CoreApplicationViewTitleBar const &sender,
            Windows::Foundation::IInspectable const &);
        void SetUpTitleBar();
    };

    void WritePropertyValue(std::any const &propertyValue,
                            winrt::Microsoft::ReactNative::IJSValueWriter const &writer);
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
