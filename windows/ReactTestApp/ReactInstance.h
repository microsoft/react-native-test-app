//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#pragma once

#include <optional>
#include <string>
#include <vector>

#include <winrt/Microsoft.ReactNative.h>
#include <winrt/Windows.Foundation.h>

namespace ReactTestApp
{
    extern std::vector<std::wstring> const JSBundleNames;

    enum class JSBundleSource {
        DevServer,
        Embedded,
    };

    class ReactInstance
    {
    public:
        ReactInstance();

        auto const &ReactHost() const
        {
            return reactNativeHost_;
        }

        bool LoadJSBundleFrom(JSBundleSource);
        void Reload();

        bool BreakOnFirstLine() const;
        void BreakOnFirstLine(bool);

        bool isFastRefreshAvailable() const
        {
            return source_ == JSBundleSource::DevServer;
        }

        bool isWebDebuggerAvailable() const
        {
            return source_ == JSBundleSource::DevServer;
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
        JSBundleSource source_ = JSBundleSource::DevServer;
    };

    std::optional<std::wstring> GetBundleName();
    winrt::Windows::Foundation::IAsyncOperation<bool> IsDevServerRunning();

}  // namespace ReactTestApp
