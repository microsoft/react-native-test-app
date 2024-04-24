#include "pch.h"

#include "Main.h"

#include "JSValueWriterHelper.h"
#include "Manifest.g.cpp"
#include "ReactInstance.h"

namespace winrt
{
    using winrt::Microsoft::ReactNative::CompositionRootView;
    using winrt::Microsoft::ReactNative::IJSValueWriter;
    using winrt::Microsoft::ReactNative::ReactCoreInjection;
    using winrt::Microsoft::ReactNative::ReactViewOptions;
    using winrt::Microsoft::UI::Composition::Compositor;
    using winrt::Microsoft::UI::Content::ContentSizePolicy;
    using winrt::Microsoft::UI::Content::DesktopChildSiteBridge;
    using winrt::Microsoft::UI::Dispatching::DispatcherQueueController;
    using winrt::Microsoft::UI::Windowing::AppWindow;
    using winrt::Microsoft::UI::Windowing::AppWindowChangedEventArgs;
    using winrt::Microsoft::UI::Windowing::OverlappedPresenter;
    using winrt::Microsoft::UI::Windowing::OverlappedPresenterState;
    using winrt::Windows::Foundation::AsyncStatus;
    using winrt::Windows::Foundation::Size;
}  // namespace winrt

namespace
{
#if _DEBUG
    constexpr bool kDebug = true;
#else
    constexpr bool kDebug = false;
#endif
    constexpr bool kSingleAppMode = static_cast<bool>(ENABLE_SINGLE_APP_MODE);

    float ScaleFactor(HWND hwnd) noexcept
    {
        return GetDpiForWindow(hwnd) / static_cast<float>(USER_DEFAULT_SCREEN_DPI);
    }

    void UpdateRootViewSizeToAppWindow(winrt::CompositionRootView const &rootView,
                                       winrt::AppWindow const &window)
    {
        // Do not relayout when minimized
        if (window.Presenter().as<winrt::OverlappedPresenter>().State() ==
            winrt::OverlappedPresenterState::Minimized) {
            return;
        }

        auto hwnd = winrt::Microsoft::UI::GetWindowFromWindowId(window.Id());
        auto scaleFactor = ScaleFactor(hwnd);
        winrt::Size size{window.ClientSize().Width / scaleFactor,
                         window.ClientSize().Height / scaleFactor};
        rootView.Arrange(size);
        rootView.Size(size);
    }

    winrt::ReactViewOptions MakeReactViewOptions(ReactApp::Component const &component)
    {
        winrt::ReactViewOptions viewOptions;
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

        return viewOptions;
    }
}  // namespace

_Use_decl_annotations_ int CALLBACK WinMain(HINSTANCE /* instance */,
                                            HINSTANCE,
                                            PSTR /* commandLine */,
                                            int /* showCmd */)
{
    auto manifest = ::ReactApp::GetManifest();
    assert(manifest.components.has_value() && (*manifest.components).size() > 0 &&
           "At least one component must be declared");

    // Initialize WinRT.
    winrt::init_apartment(winrt::apartment_type::single_threaded);

    // Enable per monitor DPI scaling
    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);

    // Create a DispatcherQueue for this thread.  This is needed for Composition, Content, and
    // Input APIs.
    auto dispatcherQueueController = winrt::DispatcherQueueController::CreateOnCurrentThread();

    // Create a Compositor for all Content on this thread.
    auto compositor = winrt::Compositor{};

    // Create a top-level window.
    auto window = winrt::AppWindow::Create();
    window.Title(winrt::to_hstring(manifest.displayName));
    window.Resize({600, 800});
    window.Show();
    auto hwnd = winrt::Microsoft::UI::GetWindowFromWindowId(window.Id());
    auto scaleFactor = ScaleFactor(hwnd);

    auto instance = ReactTestApp::ReactInstance{hwnd, compositor};
    if (manifest.bundleRoot.has_value()) {
        auto &bundleRoot = *manifest.bundleRoot;
        instance.BundleRoot(std::make_optional(winrt::to_hstring(bundleRoot)));
    }

    // Start the react-native instance, which will create a JavaScript runtime and load the
    // applications bundle
    if constexpr (kDebug) {
        instance.LoadJSBundleFrom(ReactTestApp::JSBundleSource::DevServer);
    } else {
        instance.LoadJSBundleFrom(ReactTestApp::JSBundleSource::Embedded);
    }

    // Create a RootView which will present a react-native component
    winrt::ReactViewOptions viewOptions;
    if constexpr (kSingleAppMode) {
        assert(manifest.singleApp.has_value() ||
               !"`ENABLE_SINGLE_APP_MODE` shouldn't have been true");

        for (auto &component : *manifest.components) {
            if (component.slug == *manifest.singleApp) {
                viewOptions = MakeReactViewOptions(component);
                break;
            }
        }
    } else {
        // TODO: Implement session restoration
        auto &component = (*manifest.components)[0];
        viewOptions = MakeReactViewOptions(component);
    }

    auto rootView = winrt::CompositionRootView{compositor};
    rootView.ReactViewHost(
        winrt::ReactCoreInjection::MakeViewHost(instance.ReactHost(), viewOptions));

    // Update the size of the RootView when the AppWindow changes size
    window.Changed(
        [wkRootView = winrt::make_weak(rootView)](winrt::AppWindow const &window,
                                                  winrt::AppWindowChangedEventArgs const &args) {
            if (args.DidSizeChange() || args.DidVisibilityChange()) {
                if (auto rootView = wkRootView.get()) {
                    UpdateRootViewSizeToAppWindow(rootView, window);
                }
            }
        });

    // Quit application when main window is closed
    window.Destroying([&host = instance.ReactHost()](winrt::AppWindow const & /* window */,
                                                     winrt::IInspectable const & /* args */) {
        // Before we shutdown the application - unload the ReactNativeHost to give the javascript a
        // chance to save any state
        auto async = host.UnloadInstance();
        async.Completed([host](auto asyncInfo, winrt::AsyncStatus asyncStatus) {
            assert(asyncStatus == winrt::AsyncStatus::Completed);
            host.InstanceSettings().UIDispatcher().Post([]() { PostQuitMessage(0); });
        });
    });

    // DesktopChildSiteBridge create a ContentSite that can host the RootView ContentIsland
    auto bridge = winrt::DesktopChildSiteBridge::Create(compositor, window.Id());
    bridge.Connect(rootView.Island());
    bridge.ResizePolicy(winrt::ContentSizePolicy::ResizeContentToParentWindow);

    auto invScale = 1.0f / scaleFactor;
    rootView.RootVisual().Scale({invScale, invScale, invScale});
    rootView.ScaleFactor(scaleFactor);

    // Set the intialSize of the root view
    UpdateRootViewSizeToAppWindow(rootView, window);

    bridge.Show();

    // Run the main application event loop
    dispatcherQueueController.DispatcherQueue().RunEventLoop();

    // Rundown the DispatcherQueue. This drains the queue and raises events to let components
    // know the message loop has finished.
    dispatcherQueueController.ShutdownQueue();

    bridge.Close();
    bridge = nullptr;

    // Destroy all Composition objects
    compositor.Close();
    compositor = nullptr;
}
