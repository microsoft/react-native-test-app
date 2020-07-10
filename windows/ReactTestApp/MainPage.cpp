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

    Windows::Foundation::Collections::IVector<ReactTestApp::ComponentViewModel>
    MainPage::Components()
    {
        Windows::Foundation::Collections::IVector<ReactTestApp::ComponentViewModel> components =
            winrt::single_threaded_observable_vector<ReactTestApp::ComponentViewModel>();

        for (auto &&c : GetManifest().components) {
            hstring componentDisplayName = to_hstring(c.displayName.value_or(c.appKey));
            hstring componentName = to_hstring(c.appKey);
            ReactTestApp::ComponentViewModel newComponent =
                winrt::make<ReactTestApp::implementation::ComponentViewModel>(componentName,
                                                                              componentDisplayName);
            components.Append(newComponent);
        }

        return components;
    }

    void MainPage::OnItemClick(Windows::Foundation::IInspectable const &,
                                      Windows::UI::Xaml::Controls::ItemClickEventArgs e)
    {
        IInspectable item = e.ClickedItem();
        Frame().Navigate(winrt::xaml_typename<ReactTestApp::ComponentPage>(), winrt::box_value(item.as<ReactTestApp::ComponentViewModel>()));
    }
}  // namespace winrt::ReactTestApp::implementation
