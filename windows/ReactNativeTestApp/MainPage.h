#pragma once

#include "MainPage.g.h"

namespace winrt::ReactNativeTestApp::implementation
{
    struct MainPage : MainPageT<MainPage>
    {
        MainPage();

        int32_t MyProperty();
        void MyProperty(int32_t value);

    };
}

namespace winrt::ReactNativeTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage>
    {
    };
}
