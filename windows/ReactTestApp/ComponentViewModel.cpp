#include "pch.h"

#include "ComponentViewModel.h"

#include "ComponentViewModel.g.cpp"

namespace winrt::ReactTestApp::implementation
{
    ComponentViewModel::ComponentViewModel(hstring const &name)
    {
        m_name = name;
    }

    hstring ComponentViewModel::Name()
    {
        return m_name;
    }
}  // namespace winrt::ReactTestApp::implementation
