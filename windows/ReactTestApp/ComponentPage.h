#pragma once

#include "ComponentPage.g.h"

namespace winrt::ReactTestApp::implementation
{
    struct ComponentPage : ComponentPageT<ComponentPage> {
        ComponentPage();

        void OnNavigatedTo(Windows::UI::Xaml::Navigation::NavigationEventArgs const &e);
        void ComponentPage::OnBackButtonClicked(Windows::Foundation::IInspectable const &,
                                                Windows::UI::Xaml::RoutedEventArgs e);
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct ComponentPage : ComponentPageT<ComponentPage, implementation::ComponentPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
