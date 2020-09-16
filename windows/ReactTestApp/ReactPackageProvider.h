//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#pragma once

#include <winrt/Microsoft.ReactNative.h>

namespace winrt::ReactTestApp::implementation
{
    struct ReactPackageProvider
        : implements<ReactPackageProvider, Microsoft::ReactNative::IReactPackageProvider> {
    public:
        void CreatePackage(Microsoft::ReactNative::IReactPackageBuilder const &) noexcept;
    };
}  // namespace winrt::ReactTestApp::implementation
