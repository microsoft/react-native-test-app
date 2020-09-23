//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#pragma once

#include <winrt/Microsoft.ReactNative.h>
#include <winrt/Windows.Foundation.Collections.h>

namespace winrt::Microsoft::ReactNative
{
    void RegisterAutolinkedNativeModulePackages(
        Windows::Foundation::Collections::IVector<IReactPackageProvider> const &);
}
