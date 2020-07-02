#pragma once

#include "ComponentViewModel.g.h"

using namespace std;

namespace winrt::ReactTestApp::implementation
{
    struct ComponentViewModel : ComponentViewModelT<ComponentViewModel> {
        ComponentViewModel(hstring const &name);

        hstring Name();

    private:
        hstring m_name;
    };
}  // namespace winrt::ReactTestApp::implementation
