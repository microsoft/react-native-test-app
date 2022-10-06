#include "pch.h"

#include "ReactInstance.h"

#include <NativeModules.h>
#include <filesystem>

#if __has_include(<JSI/JsiApiContext.h>)
#include <JSI/JsiApiContext.h>
#endif

#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Web.Http.Headers.h>

#include "AppRegistry.h"
#include "AutolinkedNativeModules.g.h"
#include "ReactPackageProvider.h"

using facebook::jsi::Runtime;
using ReactTestApp::ReactInstance;
using winrt::Microsoft::ReactNative::InstanceLoadedEventArgs;
using winrt::ReactTestApp::implementation::ReactPackageProvider;
using winrt::Windows::Foundation::IAsyncOperation;
using winrt::Windows::Foundation::IInspectable;
using winrt::Windows::Foundation::PropertyValue;
using winrt::Windows::Foundation::Uri;
using winrt::Windows::Storage::ApplicationData;
using winrt::Windows::Web::Http::HttpClient;

namespace
{
    winrt::hstring const kBreakOnFirstLine = L"breakOnFirstLine";
    winrt::hstring const kBundlerHost = L"bundlerHost";
    winrt::hstring const kBundlerPort = L"bundlerPort";
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
}  // namespace

std::vector<std::wstring_view> const ReactTestApp::JSBundleNames = {
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

    reactNativeHost_.InstanceSettings().InstanceLoaded(
        [this](IInspectable const & /*sender*/, InstanceLoadedEventArgs const &args) {
            context_ = args.Context();

#if __has_include(<JSI/JsiApiContext.h>)
            if (!onComponentsRegistered_) {
                return;
            }

            winrt::Microsoft::ReactNative::ExecuteJsi(context_, [this](Runtime &runtime) noexcept {
                try {
                    onComponentsRegistered_(ReactTestApp::GetAppKeys(runtime));
                } catch ([[maybe_unused]] std::exception const &e) {
#if defined(_DEBUG) && !defined(DISABLE_XAML_GENERATED_BREAK_ON_UNHANDLED_EXCEPTION)
                    if (IsDebuggerPresent()) {
                        __debugbreak();
                    }
#endif  // defined(_DEBUG) && !defined(DISABLE_XAML_GENERATED_BREAK_ON_UNHANDLED_EXCEPTION)
                }
            });
#endif  // __has_include(<JSI/JsiApiContext.h>)
        });
}

bool ReactInstance::LoadJSBundleFrom(JSBundleSource source)
{
    source_ = source;

    auto instanceSettings = reactNativeHost_.InstanceSettings();
    switch (source) {
        case JSBundleSource::DevServer:
            instanceSettings.JavaScriptBundleFile(L"index");
            break;
        case JSBundleSource::Embedded:
            auto const &bundleName = GetBundleName(bundleRoot_);
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

    instanceSettings.EnableDeveloperMenu(!UseCustomDeveloperMenu());

#ifdef _DEBUG
    instanceSettings.UseDeveloperSupport(true);
#else
    instanceSettings.UseDeveloperSupport(false);
#endif

    auto [host, port] = BundlerAddress();
    instanceSettings.SourceBundleHost(host);
    instanceSettings.SourceBundlePort(static_cast<uint16_t>(port));

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

std::tuple<winrt::hstring, int> ReactInstance::BundlerAddress() const
{
    auto localSettings = ApplicationData::Current().LocalSettings();
    auto values = localSettings.Values();
    auto host = winrt::unbox_value_or<winrt::hstring>(values.Lookup(kBundlerHost), {});
    auto port = winrt::unbox_value_or<int>(values.Lookup(kBundlerPort), 0);
    return {host, port};
}

void ReactInstance::BundlerAddress(winrt::hstring host, int port)
{
    auto localSettings = ApplicationData::Current().LocalSettings();
    auto values = localSettings.Values();

    if (host.empty()) {
        values.Remove(kBundlerHost);
    } else {
        values.Insert(kBundlerHost, PropertyValue::CreateString(host));
    }

    if (port <= 0) {
        values.Remove(kBundlerPort);
    } else {
        values.Insert(kBundlerPort, PropertyValue::CreateInt32(port));
    }

    Reload();
}

void ReactInstance::ToggleElementInspector() const
{
    if (!context_) {
        return;
    }

    context_.CallJSFunction(L"RCTDeviceEventEmitter", L"emit", L"toggleElementInspector");
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
    return IsFastRefreshAvailable() && RetrieveLocalSetting(kUseFastRefresh, true);
}

void ReactInstance::UseFastRefresh(bool useFastRefresh)
{
    StoreLocalSetting(kUseFastRefresh, useFastRefresh);
    Reload();
}

bool ReactInstance::UseWebDebugger() const
{
    return IsWebDebuggerAvailable() && RetrieveLocalSetting(kUseWebDebugger, false);
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

std::optional<winrt::hstring>
ReactTestApp::GetBundleName(std::optional<winrt::hstring> const &bundleRoot)
{
    constexpr std::wstring_view const bundleExtension = L".bundle";

    std::filesystem::path bundlePath{L"Bundle\\"};
    if (bundleRoot.has_value()) {
        std::wstring_view root = bundleRoot.value();
        for (auto &&ext : {L".windows", L".native", L""}) {
            bundlePath.replace_filename(root).replace_extension(ext) += bundleExtension;
            if (std::filesystem::exists(bundlePath)) {
                return winrt::hstring{bundlePath.stem().wstring()};
            }
        }
    } else {
        for (auto &&main : JSBundleNames) {
            bundlePath.replace_filename(main) += bundleExtension;
            if (std::filesystem::exists(bundlePath)) {
                return winrt::hstring{main};
            }
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
