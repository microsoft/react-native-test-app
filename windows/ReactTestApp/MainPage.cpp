#include "pch.h"

#include "MainPage.h"

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"
#include "Manifest.h"

using namespace winrt;
using namespace Windows::UI::Xaml;

namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();
    }

    Windows::Foundation::Collections::IVector<ReactTestApp::ComponentViewModel>
    MainPage::Components()
    {
        Windows::Foundation::Collections::IVector<ReactTestApp::ComponentViewModel> components =
            winrt::single_threaded_observable_vector<ReactTestApp::ComponentViewModel>();

        for (auto &&c : GetManifest().components) {
            hstring componentName = to_hstring(c.displayName.value_or(c.appKey));
            ReactTestApp::ComponentViewModel newComponent =
                winrt::make<ReactTestApp::implementation::ComponentViewModel>((componentName));
            components.Append(newComponent);
        }

        return components;
    }
}  // namespace winrt::ReactTestApp::implementation
