#pragma once

#include "MainPage.g.h"

namespace winrt::ReactTestApp::implementation
{
    struct MainPage : MainPageT<MainPage> {
    public:
        MainPage();

        Windows::Foundation::Collections::IVector<ReactTestApp::ComponentViewModel> Components();

        void OnItemClick(Windows::Foundation::IInspectable const &sender,
                         Windows::UI::Xaml::Controls::ItemClickEventArgs e);

    private:
        Windows::Foundation::Collections::IVector<ReactTestApp::ComponentViewModel> m_components;
        winrt::Microsoft::ReactNative::ReactNativeHost m_reactNativeHost;
        bool m_useBundle = false;

        void InitReact();
        void SetComponents();
        void LoadFromJSBundle();
        void LoadFromDevServer();
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
