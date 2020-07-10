#include "pch.h"

#include "ComponentPage.h"
#if __has_include("ComponentPage.g.cpp")
#include "ComponentPage.g.cpp"
#endif

#include <App.h>

#include "winrt/Windows.System.h"

using namespace winrt;
using namespace Windows::UI::Xaml;
using namespace Windows::UI::Core;

namespace winrt::ReactTestApp::implementation
{
    ComponentPage::ComponentPage()
    {
        InitializeComponent();
    }

    void ComponentPage::OnNavigatedTo(Windows::UI::Xaml::Navigation::NavigationEventArgs const &e)
    {
        auto app = Application::Current().as<App>();
        ReactRootView().ReactNativeHost(app->Host());
        ComponentViewModel component =
            winrt::unbox_value<ReactTestApp::ComponentViewModel>(e.Parameter());
        ReactRootView().ComponentName(component.AppKey());
        __super::OnNavigatedTo(e);
    }

    void ComponentPage::OnBackButtonClicked(Windows::Foundation::IInspectable const &,
                                            RoutedEventArgs)
    {
        if (Frame().CanGoBack()) {
            Frame().GoBack();
        }
    }
}  // namespace winrt::ReactTestApp::implementation
