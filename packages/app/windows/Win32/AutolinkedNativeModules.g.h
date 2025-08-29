#pragma once

#include <winrt/Microsoft.ReactNative.h>
#include <winrt/Windows.Foundation.Collections.h>

namespace winrt::Microsoft::ReactNative
{
    void RegisterAutolinkedNativeModulePackages(
        winrt::Windows::Foundation::Collections::IVector<IReactPackageProvider> const &);
}
