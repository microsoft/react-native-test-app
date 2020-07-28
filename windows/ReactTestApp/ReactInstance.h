#pragma once

#include <string>

#include <winrt/Microsoft.ReactNative.h>
#include <winrt/Windows.Foundation.h>

namespace ReactTestApp
{
    enum class JSBundleSource {
        DevServer,
        Embedded,
    };

    class ReactInstance
    {
    public:
        auto &ReactHost()
        {
            return reactNativeHost_;
        }

        void LoadJSBundleFrom(JSBundleSource source);

    private:
        winrt::Microsoft::ReactNative::ReactNativeHost reactNativeHost_;
    };

    std::string GetBundleName();
    winrt::Windows::Foundation::IAsyncOperation<bool> IsDevServerRunning();

}  // namespace ReactTestApp
