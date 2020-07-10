#include "pch.h"

#include "App.h"

#include "MainPage.h"

using namespace winrt::ReactTestApp;
using namespace winrt::ReactTestApp::implementation;
using namespace winrt::Windows::UI::Xaml;
using namespace winrt::Windows::UI::Xaml::Controls;
using namespace winrt::Windows::UI::Core;

/// <summary>
/// Initializes the singleton application object.  This is the first line of authored code
/// executed, and as such is the logical equivalent of main() or WinMain().
/// </summary>
App::App() noexcept
{
#if BUNDLE
    JavaScriptBundleFile(L"main.windows");
    InstanceSettings().UseWebDebugger(false);
    InstanceSettings().UseLiveReload(false);
#else
    JavaScriptMainModuleName(L"index");
    InstanceSettings().UseWebDebugger(true);
    InstanceSettings().UseLiveReload(true);
#endif

    #if _DEBUG
    InstanceSettings().EnableDeveloperMenu(true);
#else
    InstanceSettings().EnableDeveloperMenu(false);
#endif

    InitializeComponent();
}

/// <summary>
/// Invoked when the application is launched normally by the end user.  Other entry points
/// will be used such as when the application is launched to open a specific file.
/// </summary>
/// <param name="e">Details about the launch request and process.</param>
void App::OnLaunched(winrt::Windows::ApplicationModel::Activation::LaunchActivatedEventArgs e)
{
    base::OnLaunched(e);
    // Disable back button in title bar
    SystemNavigationManager::GetForCurrentView().AppViewBackButtonVisibility(
        AppViewBackButtonVisibility::Collapsed);
    Window::Current().Content().as<Frame>().Navigate(winrt::xaml_typename<ReactTestApp::MainPage>(),
                                                     e);
}
