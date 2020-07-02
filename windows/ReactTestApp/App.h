#pragma once
#include "App.xaml.g.h"

namespace winrt::ReactTestApp::implementation {
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
