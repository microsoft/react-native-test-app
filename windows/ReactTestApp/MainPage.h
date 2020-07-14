#pragma once

#include "MainPage.g.h"

namespace winrt::ReactTestApp::implementation
{
    enum class JSBundleSource {
        DevServer,
        Embedded,
    };

    struct MainPage : MainPageT<MainPage> {
    public:
        MainPage();

        void LoadFromJSBundle(Windows::Foundation::IInspectable const &,
                              Windows::UI::Xaml::RoutedEventArgs);
        void LoadFromDevServer(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs);

    private:
        winrt::Microsoft::ReactNative::ReactNativeHost m_reactNativeHost;
        std::vector<ReactTestApp::ComponentViewModel> m_components;

        void LoadJSBundleFrom(JSBundleSource source);
        void SetComponents();
        void InitReact();
        void SetReactComponentName(Windows::Foundation::IInspectable const &,
                                   Windows::UI::Xaml::RoutedEventArgs e);
        std::string GetBundleName();
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
