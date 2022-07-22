#ifndef REACTTESTAPP_JNI_COMPONENTSREGISTRY_H_
#define REACTTESTAPP_JNI_COMPONENTSREGISTRY_H_

#include <ComponentFactory.h>

#include <fbjni/fbjni.h>

namespace ReactTestApp
{
    class ComponentsRegistry : public facebook::jni::HybridClass<ComponentsRegistry>
    {
    public:
        constexpr static auto kJavaDescriptor =
            "Lcom/microsoft/reacttestapp/fabric/ComponentsRegistry;";

        static void registerNatives();

        ComponentsRegistry(facebook::react::ComponentFactory *delegate);

    private:
        static facebook::jni::local_ref<ComponentsRegistry::jhybriddata>
        initHybrid(facebook::jni::alias_ref<jclass>, facebook::react::ComponentFactory *delegate);
    };
}  // namespace ReactTestApp

#endif  // REACTTESTAPP_JNI_COMPONENTSREGISTRY_H_
