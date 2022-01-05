#include "pch.h"

#include "ReactPackageProvider.h"

#include <NativeModules.h>

using winrt::Microsoft::ReactNative::IReactPackageBuilder;
using winrt::ReactTestApp::implementation::ReactPackageProvider;

void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
{
    AddAttributedModules(packageBuilder);
}
