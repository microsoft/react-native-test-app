//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

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
        ReactInstance();

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
