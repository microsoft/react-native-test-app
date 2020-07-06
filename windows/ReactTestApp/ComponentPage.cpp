#include "pch.h"

#include "ComponentPage.h"
#if __has_include("ComponentPage.g.cpp")
#include "ComponentPage.g.cpp"
#endif

using namespace winrt;
using namespace Windows::UI::Xaml;

namespace winrt::ReactTestApp::implementation
{
    ComponentPage::ComponentPage()
    {
        InitializeComponent();
    }

}  // namespace winrt::ReactTestApp::implementation
