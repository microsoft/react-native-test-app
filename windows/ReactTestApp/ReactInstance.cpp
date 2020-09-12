//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include "pch.h"

#include "ReactInstance.h"

#include <filesystem>

#include <winrt/Windows.Web.Http.Headers.h>

#include "ReactPackageProvider.h"

using ReactTestApp::ReactInstance;
using winrt::ReactTestApp::implementation::ReactPackageProvider;
using winrt::Windows::Foundation::IAsyncOperation;
using winrt::Windows::Foundation::Uri;
using winrt::Windows::Web::Http::HttpClient;

ReactInstance::ReactInstance()
{
    reactNativeHost_.PackageProviders().Append(winrt::make<ReactPackageProvider>());
}

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

std::string ReactTestApp::GetBundleName()
{
    auto entryFileNames = {"index.windows",
                           "main.windows",
                           "index.native",
                           "main.native",
                           "index"
                           "main"};

    for (std::string main : entryFileNames) {
        std::string path = "Bundle\\" + main + ".bundle";
        if (std::filesystem::exists(path)) {
            return main;
        }
    }

    return "";
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
