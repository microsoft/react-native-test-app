//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include "pch.h"

#include "ReactInstance.h"

#include <NativeModules.h>
#include <filesystem>

#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Web.Http.Headers.h>

#include "AutolinkedNativeModules.g.h"
#include "ReactPackageProvider.h"

using ReactTestApp::ReactInstance;
using winrt::ReactTestApp::implementation::ReactPackageProvider;
using winrt::Windows::Foundation::IAsyncOperation;
using winrt::Windows::Foundation::PropertyValue;
using winrt::Windows::Foundation::Uri;
using winrt::Windows::Storage::ApplicationData;
using winrt::Windows::Web::Http::HttpClient;

namespace
{
    winrt::hstring const kBreakOnFirstLine = L"breakOnFirstLine";
    winrt::hstring const kUseDirectDebugger = L"useDirectDebugger";
    winrt::hstring const kUseFastRefresh = L"useFastRefresh";
    winrt::hstring const kUseWebDebugger = L"useWebDebugger";

    bool RetrieveLocalSetting(winrt::hstring const &key, bool defaultValue)
    {
        auto localSettings = ApplicationData::Current().LocalSettings();
        auto values = localSettings.Values();
        return winrt::unbox_value_or<bool>(values.Lookup(key), defaultValue);
    }

    void StoreLocalSetting(winrt::hstring const &key, bool value)
    {
        auto localSettings = ApplicationData::Current().LocalSettings();
        auto values = localSettings.Values();
        values.Insert(key, PropertyValue::CreateBoolean(value));
    }

    // The `DevSettings` module override used to get the `ReactContext` was
    // introduced in 0.63. `ReactContext` is needed to toggle element inspector.
    // We also need to be on a version with the fix for re-initializing native
    // modules when reloading.
#if REACT_NATIVE_VERSION > 0 && REACT_NATIVE_VERSION < 6305
    constexpr bool kUseCustomDeveloperMenu = false;
#else
    constexpr bool kUseCustomDeveloperMenu = true;

    REACT_MODULE(DevSettings)
#endif
    struct DevSettings {
        REACT_INIT(Initialize)
        void Initialize(winrt::Microsoft::ReactNative::ReactContext const &reactContext) noexcept
        {
            context_ = reactContext;
        }

        static void ToggleElementInspector() noexcept
        {
            context_.CallJSFunction(L"RCTDeviceEventEmitter", L"emit", L"toggleElementInspector");
        }

    private:
        static winrt::Microsoft::ReactNative::ReactContext context_;
    };

    winrt::Microsoft::ReactNative::ReactContext DevSettings::context_ = nullptr;
}  // namespace

std::vector<std::wstring> const ReactTestApp::JSBundleNames = {
    L"index.windows",
    L"main.windows",
    L"index.native",
    L"main.native",
    L"index",
    L"main",
};

ReactInstance::ReactInstance()
{
    reactNativeHost_.PackageProviders().Append(winrt::make<ReactPackageProvider>());
    winrt::Microsoft::ReactNative::RegisterAutolinkedNativeModulePackages(
        reactNativeHost_.PackageProviders());
}

bool ReactInstance::LoadJSBundleFrom(JSBundleSource source)
{
    source_ = source;

    auto instanceSettings = reactNativeHost_.InstanceSettings();
    switch (source) {
        case JSBundleSource::DevServer:
#if REACT_NATIVE_VERSION > 0 && REACT_NATIVE_VERSION < 6400
            instanceSettings.JavaScriptMainModuleName(L"index");
            instanceSettings.JavaScriptBundleFile(L"");
#else
            instanceSettings.JavaScriptBundleFile(L"index");
#endif
            break;
        case JSBundleSource::Embedded:
            auto const bundleName = GetBundleName();
            if (!bundleName.has_value()) {
                return false;
            }
            instanceSettings.JavaScriptBundleFile(bundleName.value());
            break;
    }

    Reload();
    return true;
}

void ReactInstance::Reload()
{
    auto instanceSettings = reactNativeHost_.InstanceSettings();

    instanceSettings.UseWebDebugger(UseWebDebugger());
    instanceSettings.UseDirectDebugger(UseDirectDebugger());

    auto useFastRefresh = UseFastRefresh();
    instanceSettings.UseFastRefresh(useFastRefresh);
    instanceSettings.UseLiveReload(useFastRefresh);

    instanceSettings.EnableDeveloperMenu(!kUseCustomDeveloperMenu);

#ifdef _DEBUG
    instanceSettings.UseDeveloperSupport(true);
#else
    instanceSettings.UseDeveloperSupport(false);
#endif

    reactNativeHost_.ReloadInstance();
}

bool ReactInstance::BreakOnFirstLine() const
{
    return RetrieveLocalSetting(kBreakOnFirstLine, false);
}

void ReactInstance::BreakOnFirstLine(bool breakOnFirstLine)
{
    StoreLocalSetting(kBreakOnFirstLine, breakOnFirstLine);
    Reload();
}

void ReactInstance::ToggleElementInspector() const
{
    DevSettings::ToggleElementInspector();
}

bool ReactInstance::UseCustomDeveloperMenu() const
{
    return kUseCustomDeveloperMenu;
}

bool ReactInstance::UseDirectDebugger() const
{
    return RetrieveLocalSetting(kUseDirectDebugger, false);
}

void ReactInstance::UseDirectDebugger(bool useDirectDebugger)
{
    if (useDirectDebugger) {
        // Remote debugging is incompatible with direct debugging
        StoreLocalSetting(kUseWebDebugger, false);
    }
    StoreLocalSetting(kUseDirectDebugger, useDirectDebugger);
    Reload();
}

bool ReactInstance::UseFastRefresh() const
{
    return isFastRefreshAvailable() && RetrieveLocalSetting(kUseFastRefresh, true);
}

void ReactInstance::UseFastRefresh(bool useFastRefresh)
{
    StoreLocalSetting(kUseFastRefresh, useFastRefresh);
    Reload();
}

bool ReactInstance::UseWebDebugger() const
{
    return isWebDebuggerAvailable() && RetrieveLocalSetting(kUseWebDebugger, false);
}

void ReactInstance::UseWebDebugger(bool useWebDebugger)
{
    if (useWebDebugger) {
        // Remote debugging is incompatible with direct debugging
        StoreLocalSetting(kUseDirectDebugger, false);
    }
    StoreLocalSetting(kUseWebDebugger, useWebDebugger);
    Reload();
}

std::optional<std::wstring> ReactTestApp::GetBundleName()
{
    for (auto &&main : JSBundleNames) {
        if (std::filesystem::exists(L"Bundle\\" + main + L".bundle")) {
            return main;
        }
    }

    return std::nullopt;
}

IAsyncOperation<bool> ReactTestApp::IsDevServerRunning()
{
    Uri uri(L"http://localhost:8081/status");
    HttpClient httpClient;
    try {
        auto r = co_await httpClient.GetAsync(uri);
        co_return r.IsSuccessStatusCode();
    } catch (winrt::hresult_error &) {
        co_return false;
    }
}
