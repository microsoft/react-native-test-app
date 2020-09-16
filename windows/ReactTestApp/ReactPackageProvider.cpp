//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include "pch.h"

#include "ReactPackageProvider.h"

#include <NativeModules.h>

using winrt::Microsoft::ReactNative::IReactPackageBuilder;
using winrt::ReactTestApp::implementation::ReactPackageProvider;

void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
{
    AddAttributedModules(packageBuilder);
}
