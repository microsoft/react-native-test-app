#pragma once

#include "App.xaml.g.h"
#define BUNDLE true

namespace winrt::ReactTestApp::implementation
{
    struct App : AppT<App> {
        App() noexcept;

        void OnLaunched(winrt::Windows::ApplicationModel::Activation::LaunchActivatedEventArgs);
        using base = AppT;
    };
}  // namespace winrt::ReactTestApp::implementation
