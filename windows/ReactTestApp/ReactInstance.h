#pragma once

#include <functional>
#include <optional>
#include <string>
#include <string_view>
#include <tuple>
#include <vector>

#include <winrt/Microsoft.ReactNative.h>
#include <winrt/Windows.Foundation.h>

#include <ReactContext.h>

namespace ReactTestApp
{
    extern std::vector<std::wstring_view> const JSBundleNames;

    enum class JSBundleSource {
        DevServer,
        Embedded,
    };

    using OnComponentsRegistered = std::function<void(std::vector<std::string> const &)>;

    class ReactInstance
    {
    public:
        static constexpr uint32_t Version = REACT_NATIVE_VERSION;

        ReactInstance();

        auto const &ReactHost() const
        {
            return reactNativeHost_;
        }

        bool LoadJSBundleFrom(JSBundleSource);
        void Reload();

        bool BreakOnFirstLine() const;
        void BreakOnFirstLine(bool);

        auto const &BundleRoot() const
        {
            return bundleRoot_;
        }

        void BundleRoot(std::optional<winrt::hstring> bundleRoot)
        {
            bundleRoot_ = std::move(bundleRoot);
        }

        std::tuple<winrt::hstring, int> BundlerAddress() const;
        void BundlerAddress(winrt::hstring host, int port);

        bool IsFastRefreshAvailable() const
        {
            return source_ == JSBundleSource::DevServer;
        }

        bool IsWebDebuggerAvailable() const
        {
            return source_ == JSBundleSource::DevServer;
        }

        template <typename F>
        void SetComponentsRegisteredDelegate(F &&f)
        {
            onComponentsRegistered_ = std::forward<F>(f);
        }

        void ToggleElementInspector() const;

        bool UseCustomDeveloperMenu() const;

        bool UseDirectDebugger() const;
        void UseDirectDebugger(bool);

        bool UseFastRefresh() const;
        void UseFastRefresh(bool);

        bool UseWebDebugger() const;
        void UseWebDebugger(bool);

    private:
        winrt::Microsoft::ReactNative::ReactNativeHost reactNativeHost_;
        winrt::Microsoft::ReactNative::ReactContext context_;
        std::optional<winrt::hstring> bundleRoot_;
        JSBundleSource source_ = JSBundleSource::DevServer;
        OnComponentsRegistered onComponentsRegistered_;
    };

    std::optional<winrt::hstring> GetBundleName(std::optional<winrt::hstring> const &bundleRoot);
    winrt::Windows::Foundation::IAsyncOperation<bool> IsDevServerRunning();

}  // namespace ReactTestApp
