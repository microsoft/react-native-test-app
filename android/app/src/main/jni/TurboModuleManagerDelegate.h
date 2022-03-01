#ifndef REACTTESTAPP_JNI_TURBOMODULEMANAGERDELEGATE_H_
#define REACTTESTAPP_JNI_TURBOMODULEMANAGERDELEGATE_H_

#include <memory>
#include <string>

#include <fbjni/fbjni.h>

#include <ReactCommon/TurboModuleManagerDelegate.h>

namespace ReactTestApp
{
    class TurboModuleManagerDelegate
        : public facebook::jni::HybridClass<TurboModuleManagerDelegate,
                                            facebook::react::TurboModuleManagerDelegate>
    {
    public:
        static constexpr auto kJavaDescriptor =
            "Lcom/microsoft/reacttestapp/turbomodule/TurboModuleManagerDelegate;";

        static void registerNatives();

        std::shared_ptr<facebook::react::TurboModule>
        getTurboModule(const std::string name,  //
                       const std::shared_ptr<facebook::react::CallInvoker> jsInvoker) override;

        std::shared_ptr<facebook::react::TurboModule>
        getTurboModule(const std::string name,  //
                       const facebook::react::JavaTurboModule::InitParams &params) override;

    private:
        static facebook::jni::local_ref<jhybriddata>
            initHybrid(facebook::jni::alias_ref<jhybridobject>);

        /**
         * Test-only method. Allows user to verify whether a TurboModule can be
         * created by instances of this class.
         */
        bool canCreateTurboModule(std::string name);
    };
}  // namespace ReactTestApp

#endif  // REACTTESTAPP_JNI_TURBOMODULEMANAGERDELEGATE_H_
