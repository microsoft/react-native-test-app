#pragma once

#include "ComponentViewModel.g.h"

namespace winrt::ReactTestApp::implementation
{
    struct ComponentViewModel : ComponentViewModelT<ComponentViewModel> {
        ComponentViewModel(hstring const &name, hstring const &display_name);

        hstring AppKey();

        hstring DisplayName();

    private:
        hstring m_app_key;
        hstring m_display_name;
    };
}  // namespace winrt::ReactTestApp::implementation
