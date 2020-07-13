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

    hstring ComponentViewModel::AppKey()
    {
        return appKey_;
    }

    hstring ComponentViewModel::DisplayName()
    {
        return displayName_;
    }
}  // namespace winrt::ReactTestApp::implementation
