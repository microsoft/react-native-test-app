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
