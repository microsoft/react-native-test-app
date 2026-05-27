#include "pch.h"

#include "Main.h"

#include <commctrl.h>

#include "DevMenu.h"
#include "JSValueWriterHelper.h"
#include "Manifest.g.cpp"
#include "ReactInstance.h"

namespace winrt
{
    using winrt::Microsoft::ReactNative::IJSValueWriter;
    using winrt::Microsoft::ReactNative::ReactViewOptions;
}  // namespace winrt

namespace
{
#if _DEBUG
    constexpr bool kDebug = true;
#else
    constexpr bool kDebug = false;
#endif
    constexpr bool kSingleAppMode = static_cast<bool>(ENABLE_SINGLE_APP_MODE);

    void ConfigureReactViewOptions(winrt::ReactViewOptions viewOptions,
                                   ReactApp::Component const &component)
    {
        viewOptions.ComponentName(winrt::to_hstring(component.appKey));

        auto initialProps = component.initialProperties.value_or<ReactApp::JSONObject>({});
        initialProps["concurrentRoot"] = true;
        viewOptions.InitialProps(
            [initialProps = std::move(initialProps)](winrt::IJSValueWriter const &writer) {
                writer.WriteObjectBegin();
                for (auto &[key, value] : initialProps) {
                    writer.WritePropertyName(winrt::to_hstring(key));
                    ReactApp::JSValueWriterWriteValue(writer, value);
                }
                writer.WriteObjectEnd();
            });
    }
}  // namespace

LRESULT APIENTRY SubclassProc(
    HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam, UINT_PTR uIdSubclass, DWORD_PTR dwRefData);

_Use_decl_annotations_ int CALLBACK WinMain(HINSTANCE /* hInstance */,
                                            HINSTANCE /* hPrevInstance */,
                                            PSTR /* lpCmdLine */,
                                            int /* nShowCmd */)
{
    auto manifest = ReactApp::GetManifest();
    assert(manifest.components.has_value() && (*manifest.components).size() > 0 &&
           "At least one component must be declared");

    // Initialize WinRT.
    winrt::init_apartment(winrt::apartment_type::single_threaded);

    // Enable per monitor DPI scaling
    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

    auto app = winrt::Microsoft::ReactNative::ReactNativeAppBuilder().Build();
    auto instance = ReactTestApp::ReactInstance{app.ReactNativeHost()};
    if (manifest.bundleRoot.has_value()) {
        auto &bundleRoot = *manifest.bundleRoot;
        instance.BundleRoot(std::make_optional(winrt::to_hstring(bundleRoot)));
    }

    // Start the react-native instance, which will create a JavaScript runtime and load the
    // applications bundle
    if constexpr (kDebug) {
        instance.LoadJSBundleFrom(ReactTestApp::JSBundleSource::DevServer, false);
    } else {
        instance.LoadJSBundleFrom(ReactTestApp::JSBundleSource::Embedded, false);
    }

    // Configure ReactViewOptions to load the initial component
    if constexpr (kSingleAppMode) {
        assert(manifest.singleApp.has_value() ||
               !"`ENABLE_SINGLE_APP_MODE` shouldn't have been true");

        for (auto &component : *manifest.components) {
            if (component.slug == *manifest.singleApp) {
                ConfigureReactViewOptions(app.ReactViewOptions(), component);
                break;
            }
        }
    } else {
        // TODO: Implement session restoration
        auto &component = (*manifest.components)[0];
        ConfigureReactViewOptions(app.ReactViewOptions(), component);
    }

    auto window = app.AppWindow();
    window.Title(winrt::to_hstring(manifest.displayName));
    window.Resize({600, 800});

#if _DEBUG
    ReactApp::DevMenu devMenu{instance, manifest.components.value_or({})};
    auto hWnd = GetWindowFromWindowId(window.Id());
    SetMenu(hWnd, devMenu.Handle());
    SetWindowSubclass(hWnd,
                      SubclassProc,
                      reinterpret_cast<UINT_PTR>(&devMenu),
                      reinterpret_cast<DWORD_PTR>(&devMenu));
#endif  // _DEBUG

    app.Start();
    return 0;
}

LRESULT APIENTRY SubclassProc(
    HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam, UINT_PTR uIdSubclass, DWORD_PTR dwRefData)
{
    switch (uMsg) {
        case WM_COMMAND: {
            auto const &devMenu = *reinterpret_cast<ReactApp::DevMenu *>(dwRefData);
            devMenu.OnCommand(static_cast<ReactApp::DevMenuCommand>(LOWORD(wParam)));
            return TRUE;
        }
        case WM_NCDESTROY: {
            RemoveWindowSubclass(hWnd, SubclassProc, uIdSubclass);
            break;
        }
    }
    return DefSubclassProc(hWnd, uMsg, wParam, lParam);
}
