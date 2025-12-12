#ifndef ANDROID_JNI_APPREGISTRY_
#define ANDROID_JNI_APPREGISTRY_

#include <jni.h>

extern "C" {

JNIEXPORT jobjectArray JNICALL Java_com_microsoft_reacttestapp_react_AppRegistry_getAppKeys(
    JNIEnv *env, jclass clazz, jlong jsiPtr);

}  // extern "C"

#endif  // ANDROID_JNI_APPREGISTRY_
