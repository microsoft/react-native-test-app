#ifndef REACTAPP_JNI_AUTOLINKINGCOMPAT_H_
#define REACTAPP_JNI_AUTOLINKINGCOMPAT_H_

#if __has_include(<FBReactNativeSpec.h>)  // >= 0.81

#include <FBReactNativeSpec.h>

#define rncore_ModuleProvider facebook::react::FBReactNativeSpec_ModuleProvider

#else  // < 0.81

#include <rncore.h>

#endif  // __has_include(<FBReactNativeSpec.h>)  // >= 0.81

#include <autolinking.h>

#define autolinking_ModuleProvider facebook::react::autolinking_ModuleProvider
#define autolinking_cxxModuleProvider facebook::react::autolinking_cxxModuleProvider
#define autolinking_registerProviders facebook::react::autolinking_registerProviders

#endif  // REACTAPP_JNI_AUTOLINKINGCOMPAT_H_
