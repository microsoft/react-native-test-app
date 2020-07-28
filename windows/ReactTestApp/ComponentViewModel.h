#pragma once

#include "ComponentViewModel.g.h"

namespace winrt::ReactTestApp::implementation
{
    struct ComponentViewModel : ComponentViewModelT<ComponentViewModel> {
        ComponentViewModel(hstring const &appKey, hstring const &displayName);

        hstring AppKey();

        hstring DisplayName();

    private:
        hstring appKey_;
        hstring displayName_;
    };
}  // namespace winrt::ReactTestApp::implementation
