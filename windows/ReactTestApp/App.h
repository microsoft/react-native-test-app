//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#pragma once

#include "App.xaml.g.h"

namespace winrt::ReactTestApp::implementation
{
    struct App : AppT<App> {
        App();

        void OnLaunched(Windows::ApplicationModel::Activation::LaunchActivatedEventArgs const &);
        void OnSuspending(IInspectable const &,
                          Windows::ApplicationModel::SuspendingEventArgs const &);
        void OnNavigationFailed(IInspectable const &,
                                Windows::UI::Xaml::Navigation::NavigationFailedEventArgs const &);

    private:
        void NavigateToFirstPage(
            Windows::UI::Xaml::Controls::Frame &rootFrame,
            Windows::ApplicationModel::Activation::LaunchActivatedEventArgs const &e);
    };
}  // namespace winrt::ReactTestApp::implementation
