//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

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

        void Reload(Windows::Foundation::IInspectable const &, Windows::UI::Xaml::RoutedEventArgs);
        void ToggleBreakOnFirstLine(Windows::Foundation::IInspectable const &,
                                    Windows::UI::Xaml::RoutedEventArgs);
        void ToggleDirectDebugger(Windows::Foundation::IInspectable const &,
                                  Windows::UI::Xaml::RoutedEventArgs);
        void ToggleFastRefresh(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs);
        void ToggleInspector(Windows::Foundation::IInspectable const &,
                             Windows::UI::Xaml::RoutedEventArgs);
        void ToggleWebDebugger(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs);

        Windows::Foundation::IAsyncAction
        OnNavigatedTo(Windows::UI::Xaml::Navigation::NavigationEventArgs const &);

    private:
        using Base = MainPageT;

        ::ReactTestApp::ReactInstance reactInstance_;

        void InitializeDebugMenu();
        void InitializeReactMenu();
        void InitializeTitleBar();

        void LoadReactComponent(::ReactTestApp::Component const &);

        void OnCoreTitleBarLayoutMetricsChanged(
            Windows::ApplicationModel::Core::CoreApplicationViewTitleBar const &,
            Windows::Foundation::IInspectable const &);
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
