#include "AppRegistry.h"

#include "common/AppRegistry.h"

extern "C" {

JNIEXPORT jobjectArray JNICALL Java_com_microsoft_reacttestapp_react_AppRegistry_getAppKeys(
    JNIEnv *env, jclass clazz, jlong jsiPtr)
{
    auto runtime = reinterpret_cast<facebook::jsi::Runtime *>(jsiPtr);
    auto appKeys = ReactTestApp::GetAppKeys(*runtime);
    auto numKeys = static_cast<int>(appKeys.size());
    auto result = env->NewObjectArray(numKeys, env->FindClass("java/lang/String"), nullptr);
    for (int i = 0; i < numKeys; ++i) {
        env->SetObjectArrayElement(result, i, env->NewStringUTF(appKeys[i].c_str()));
    }
    return result;
}

}  // extern "C"
