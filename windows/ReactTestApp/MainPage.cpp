#include "pch.h"

#include "MainPage.h"

#include "ComponentViewModel.h"
#include "MainPage.g.cpp"
#include "Manifest.h"

using winrt::Windows::Foundation::Collections::IVector;
using namespace winrt::Microsoft::ReactNative;


namespace winrt::ReactTestApp::implementation
{
    MainPage::MainPage()
    {
        SetComponents();

        InitializeComponent();
        InitReact();
    }

    void MainPage::OnItemClick(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::Controls::ItemClickEventArgs e)
    {
        IInspectable item = e.ClickedItem();
    }

    void MainPage::SetComponents()
    {
        m_components =
            winrt::single_threaded_observable_vector<ReactTestApp::ComponentViewModel>();

        for (auto &&c : ::ReactTestApp::GetManifest().components) {
            hstring componentDisplayName = to_hstring(c.displayName.value_or(c.appKey));
            hstring componentName = to_hstring(c.appKey);
            ReactTestApp::ComponentViewModel newComponent =
                winrt::make<ComponentViewModel>(componentName, componentDisplayName);
            m_components.Append(newComponent);
        }
    }

    IVector<ReactTestApp::ComponentViewModel> MainPage::Components()
    {
        return m_components;
    }

    void MainPage::InitReact()
    {
        m_reactNativeHost = ReactNativeHost();
        
        LoadFromDevServer();
        ReactRootView().ComponentName(L"Example");  // TODO don't hardcode
        ReactRootView().ReactNativeHost(m_reactNativeHost);
        m_reactNativeHost.ReloadInstance();
    }

    void MainPage::LoadFromJSBundle()
    {
        m_reactNativeHost.InstanceSettings().UseLiveReload(false);
        m_reactNativeHost.InstanceSettings().UseWebDebugger(false);
        m_reactNativeHost.InstanceSettings().UseFastRefresh(false);
        m_reactNativeHost.InstanceSettings().JavaScriptBundleFile(L"main.windows");
    }

    void MainPage::LoadFromDevServer()
    {
        m_reactNativeHost.InstanceSettings().UseLiveReload(true);
        m_reactNativeHost.InstanceSettings().UseWebDebugger(true);
        m_reactNativeHost.InstanceSettings().UseFastRefresh(true);
        m_reactNativeHost.InstanceSettings().JavaScriptBundleFile(L"index.windows");
    }
}  // namespace winrt::ReactTestApp::implementation
