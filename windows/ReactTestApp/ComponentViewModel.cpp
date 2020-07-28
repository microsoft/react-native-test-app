#include "pch.h"

#include "ComponentViewModel.h"

#include "ComponentViewModel.g.cpp"

namespace winrt::ReactTestApp::implementation
{
    ComponentViewModel::ComponentViewModel(hstring const &appKey, hstring const &displayName)
    {
        appKey_ = appKey;
        displayName_ = displayName;
    }
}  // namespace winrt::ReactTestApp::implementation
