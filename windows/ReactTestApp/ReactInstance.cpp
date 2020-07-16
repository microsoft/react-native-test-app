#include "pch.h"

#include "ReactInstance.h"

#include <filesystem>

namespace ReactTestApp
{
    void ReactInstance::LoadJSBundleFrom(JSBundleSource source)
    {
        auto instanceSettings = reactNativeHost_.InstanceSettings();
        instanceSettings.UseLiveReload(source == JSBundleSource::DevServer);
        instanceSettings.UseWebDebugger(source == JSBundleSource::DevServer);
        instanceSettings.UseFastRefresh(source == JSBundleSource::DevServer);

        switch (source) {
            case JSBundleSource::DevServer:
                instanceSettings.JavaScriptMainModuleName(L"index");
                instanceSettings.JavaScriptBundleFile(L"");
                break;
            case JSBundleSource::Embedded:
                winrt::hstring bundleFileName = winrt::to_hstring(GetBundleName());
                instanceSettings.JavaScriptBundleFile(bundleFileName);
                break;
        }

        reactNativeHost_.ReloadInstance();
    }

    winrt::Microsoft::ReactNative::ReactNativeHost &ReactInstance::ReactHost()
    {
        return reactNativeHost_;
    }

    std::string GetBundleName()
    {
        std::vector entryFileNames = {"index.windows",
                                      "main.windows",
                                      "index.native",
                                      "main.native",
                                      "index"
                                      "main"};

        for (std::string &&n : entryFileNames) {
            std::string path = "Bundle\\" + n + ".bundle";
            if (std::filesystem::exists(path)) {
                return n;
            }
        }

        return "";  // TODO handle bundle not present
    }
}  // namespace ReactTestApp
