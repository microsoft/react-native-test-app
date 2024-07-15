#if __has_include(<DefaultTurboModuleManagerDelegate.h>)

#include <DefaultComponentsRegistry.h>
#include <DefaultTurboModuleManagerDelegate.h>

#include <fbjni/fbjni.h>

#include <ReactCommon/CallInvoker.h>

#include "AutolinkingCompat.h"

using facebook::react::CallInvoker;
using facebook::react::DefaultComponentsRegistry;
using facebook::react::DefaultTurboModuleManagerDelegate;
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
}  // namespace

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *)
{
    return facebook::jni::initialize(vm, [] {
        DefaultTurboModuleManagerDelegate::cxxModuleProvider = &cxxModuleProvider;
        DefaultTurboModuleManagerDelegate::javaModuleProvider = &autolinking_ModuleProvider;
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
