#pragma once

#include <any>
#include <map>
#include <optional>
#include <string>

#include "MainPage.g.h"
#include "Manifest.h"
#include "ReactInstance.h"

namespace winrt::ReactTestApp::implementation
{
    struct MainPage : MainPageT<MainPage> {
    public:
        MainPage();

        // React menu

        Windows::Foundation::IAsyncAction LoadFromDevServer(
            Windows::Foundation::IInspectable const &, Windows::UI::Xaml::RoutedEventArgs);
        void LoadFromJSBundle(Windows::Foundation::IInspectable const &,
                              Windows::UI::Xaml::RoutedEventArgs);
        void ToggleRememberLastComponent(Windows::Foundation::IInspectable const &,
                                         Windows::UI::Xaml::RoutedEventArgs);

        // Debug menu

        void ConfigureBundler(Windows::Foundation::IInspectable const &,
                              Windows::UI::Xaml::RoutedEventArgs);
        void ConfigureBundlerDialog_Apply(
            Windows::Foundation::IInspectable const &,
            Windows::UI::Xaml::Controls::ContentDialogButtonClickEventArgs const);
        void ConfigureBundlerDialog_Reset(
            Windows::Foundation::IInspectable const &,
            Windows::UI::Xaml::Controls::ContentDialogButtonClickEventArgs const);

        void Reload(Windows::Foundation::IInspectable const &, Windows::UI::Xaml::RoutedEventArgs);
        void ToggleBreakOnFirstLine(Windows::Foundation::IInspectable const &,
                                    Windows::UI::Xaml::RoutedEventArgs);
        void ToggleDirectDebugger(Windows::Foundation::IInspectable const &,
                                  Windows::UI::Xaml::RoutedEventArgs);
        void ToggleFastRefresh(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs);
        void ToggleInspector(Windows::Foundation::IInspectable const &,
                             Windows::UI::Xaml::RoutedEventArgs);
        void ToggleWebDebugger(Windows::Foundation::IInspectable const &,
                               Windows::UI::Xaml::RoutedEventArgs);

        Windows::Foundation::IAsyncAction
        OnNavigatedTo(Windows::UI::Xaml::Navigation::NavigationEventArgs const &);

    private:
        using Base = MainPageT;

        ::ReactTestApp::ReactInstance reactInstance_;
        std::string manifestChecksum_;

        void InitializeDebugMenu();
        void InitializeReactMenu(std::optional<::ReactTestApp::Manifest>);
        void InitializeTitleBar();

        bool IsPresenting();

        bool LoadJSBundleFrom(::ReactTestApp::JSBundleSource);
        void LoadReactComponent(::ReactTestApp::Component const &);

        void OnComponentsRegistered(std::vector<::ReactTestApp::Component>);

        void OnCoreTitleBarLayoutMetricsChanged(
            Windows::ApplicationModel::Core::CoreApplicationViewTitleBar const &,
            Windows::Foundation::IInspectable const &);

        void PresentReactMenu();
    };
}  // namespace winrt::ReactTestApp::implementation

namespace winrt::ReactTestApp::factory_implementation
{
    struct MainPage : MainPageT<MainPage, implementation::MainPage> {
    };
}  // namespace winrt::ReactTestApp::factory_implementation
