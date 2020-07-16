#pragma once
#include <string>

namespace ReactTestApp
{
    enum class JSBundleSource {
        DevServer,
        Embedded,
    };

    class ReactInstance
    {
    public:
        winrt::Microsoft::ReactNative::ReactNativeHost &ReactHost();
        void LoadJSBundleFrom(JSBundleSource source);

    private:
        winrt::Microsoft::ReactNative::ReactNativeHost reactNativeHost_;
    };

    std::string GetBundleName();

}  // namespace ReactTestApp
