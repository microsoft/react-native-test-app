#include "pch.h"

#include "MainPage.h"

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"
#include "Manifest.h"

using winrt::Windows::Foundation::Collections::IVector;

namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();
    }

    IVector<ReactTestApp::ComponentViewModel> MainPage::Components()
    {
        IVector<ReactTestApp::ComponentViewModel> components =
            winrt::single_threaded_observable_vector<ReactTestApp::ComponentViewModel>();

        for (auto &&c : ::ReactTestApp::GetManifest().components) {
            hstring componentName = to_hstring(c.displayName.value_or(c.appKey));
            ReactTestApp::ComponentViewModel newComponent =
                winrt::make<ComponentViewModel>(componentName);
            components.Append(newComponent);
        }

        return components;
    }
}  // namespace winrt::ReactTestApp::implementation
