#include "TurboModuleManagerDelegate.h"

#include <rncli.h>
#include <rncore.h>

using facebook::react::CallInvoker;
using facebook::react::JavaTurboModule;
using facebook::react::TurboModule;
using ReactTestApp::TurboModuleManagerDelegate;

void TurboModuleManagerDelegate::registerNatives()
{
    registerHybrid({
        makeNativeMethod("initHybrid", TurboModuleManagerDelegate::initHybrid),
        makeNativeMethod("canCreateTurboModule", TurboModuleManagerDelegate::canCreateTurboModule),
    });
}

std::shared_ptr<TurboModule>
TurboModuleManagerDelegate::getTurboModule(const std::string, const std::shared_ptr<CallInvoker>)
{
    return nullptr;
}

std::shared_ptr<TurboModule> TurboModuleManagerDelegate::getTurboModule(
    const std::string name, const JavaTurboModule::InitParams &params)
{
    // Try autolinked module providers first
    auto rncli_module = rncli_ModuleProvider(name, params);
    if (rncli_module != nullptr) {
        return rncli_module;
    }

    return rncore_ModuleProvider(name, params);
}

facebook::jni::local_ref<TurboModuleManagerDelegate::jhybriddata>
TurboModuleManagerDelegate::initHybrid(
    facebook::jni::alias_ref<TurboModuleManagerDelegate::jhybridobject>)
{
    return makeCxxInstance();
}

bool TurboModuleManagerDelegate::canCreateTurboModule(std::string name)
{
    return getTurboModule(name, nullptr) != nullptr ||
           getTurboModule(name, {.moduleName = name}) != nullptr;
}
