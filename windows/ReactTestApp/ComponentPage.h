#pragma once

#include "ComponentPage.g.h"

namespace winrt::ReactTestApp::implementation
{
    struct ComponentPage : ComponentPageT<ComponentPage> {
        ComponentPage();
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct ComponentPage : ComponentPageT<ComponentPage, implementation::ComponentPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
