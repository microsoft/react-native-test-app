// https://github.com/facebook/react-native/blob/main/packages/react-native/ReactAndroid/cmake-utils/default-app-setup/OnLoad.cpp
#if __has_include(<DefaultTurboModuleManagerDelegate.h>)

#include <DefaultComponentsRegistry.h>
#include <DefaultTurboModuleManagerDelegate.h>
#include <rncore.h>

#include <fbjni/fbjni.h>

#include <ReactCommon/CallInvoker.h>

#include "AutolinkingCompat.h"

using facebook::react::CallInvoker;
using facebook::react::DefaultComponentsRegistry;
using facebook::react::DefaultTurboModuleManagerDelegate;
using facebook::react::JavaTurboModule;
using facebook::react::TurboModule;

namespace
{
    std::shared_ptr<TurboModule> cxxModuleProvider(const std::string &name,
                                                   const std::shared_ptr<CallInvoker> &jsInvoker)
    {
#if __has_include(<ReactCommon/CxxReactPackage.h>)
        return autolinking_cxxModuleProvider(name, jsInvoker);
#else
        return nullptr;
#endif  // __has_include(<ReactCommon/CxxReactPackage.h>)
    }

    std::shared_ptr<TurboModule> javaModuleProvider(const std::string &name,
                                                    const JavaTurboModule::InitParams &params)
    {
#if __has_include(<autolinking.h>)  // >= 0.75
        // We first try to look up core modules
        if (auto module = rncore_ModuleProvider(name, params)) {
            return module;
        }
#endif  // __has_include(<autolinking.h>)

        // And we fallback to the module providers autolinked by RN CLI
        return autolinking_ModuleProvider(name, params);
    }
}  // namespace

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *)
{
    return facebook::jni::initialize(vm, [] {
        DefaultTurboModuleManagerDelegate::cxxModuleProvider = &cxxModuleProvider;
        DefaultTurboModuleManagerDelegate::javaModuleProvider = &javaModuleProvider;
        DefaultComponentsRegistry::registerComponentDescriptorsFromEntryPoint =
            &autolinking_registerProviders;
    });
}

#else  // __has_include(<DefaultTurboModuleManagerDelegate.h>)

#include <fbjni/fbjni.h>

#include "ComponentsRegistry.h"
#include "TurboModuleManagerDelegate.h"

using ReactTestApp::ComponentsRegistry;
using ReactTestApp::TurboModuleManagerDelegate;

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *)
{
    return facebook::jni::initialize(vm, [] {
        TurboModuleManagerDelegate::registerNatives();
        ComponentsRegistry::registerNatives();
    });
}

#endif  // __has_include(<DefaultTurboModuleManagerDelegate.h>)
