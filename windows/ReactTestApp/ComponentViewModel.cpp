#include "pch.h"

#include "ComponentViewModel.h"

#include "ComponentViewModel.g.cpp"

namespace winrt::ReactTestApp::implementation
{
    ComponentViewModel::ComponentViewModel(hstring const &name, hstring const &display_name)
    {
        m_app_key = name;
        m_display_name = display_name;
    }

    hstring ComponentViewModel::AppKey()
    {
        return m_app_key;
    }

    hstring ComponentViewModel::DisplayName()
    {
        return m_display_name;
    }
}  // namespace winrt::ReactTestApp::implementation
