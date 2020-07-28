#pragma once

#include "ComponentViewModel.g.h"

namespace winrt::ReactTestApp::implementation
{
    struct ComponentViewModel : ComponentViewModelT<ComponentViewModel> {
        ComponentViewModel(hstring const &appKey, hstring const &displayName);

        auto AppKey()
        {
            return appKey_;
        }

        auto DisplayName()
        {
            return displayName_;
        }

    private:
        hstring appKey_;
        hstring displayName_;
    };
}  // namespace winrt::ReactTestApp::implementation
