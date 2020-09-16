//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#pragma once

#define NOMINMAX

#include <hstring.h>
#include <restrictederrorinfo.h>
#include <unknwn.h>
#include <windows.h>

#include <winrt/Microsoft.ReactNative.h>

#if __has_include(<winrt/Microsoft.UI.Xaml.Controls.h>)
#include <winrt/Microsoft.UI.Xaml.Controls.h>
#endif
#if __has_include(<winrt/Microsoft.UI.Xaml.XamlTypeInfo.h>)
#include <winrt/Microsoft.UI.Xaml.XamlTypeInfo.h>
#endif

#include <winrt/Windows.ApplicationModel.Activation.h>
#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.UI.Core.h>
#include <winrt/Windows.UI.Input.Preview.Injection.h>
#include <winrt/Windows.UI.Xaml.Controls.Primitives.h>
#include <winrt/Windows.UI.Xaml.Controls.h>
#include <winrt/Windows.UI.Xaml.Data.h>
#include <winrt/Windows.UI.Xaml.Input.h>
#include <winrt/Windows.UI.Xaml.Interop.h>
#include <winrt/Windows.UI.Xaml.Markup.h>
#include <winrt/Windows.UI.Xaml.Navigation.h>
#include <winrt/Windows.UI.Xaml.h>
