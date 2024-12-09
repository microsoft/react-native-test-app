#ifndef REACTAPP_JNI_AUTOLINKINGCOMPAT_H_
#define REACTAPP_JNI_AUTOLINKINGCOMPAT_H_

#if __has_include(<autolinking.h>)  // >= 0.75

#include <autolinking.h>

#define autolinking_ModuleProvider facebook::react::autolinking_ModuleProvider
#define autolinking_cxxModuleProvider facebook::react::autolinking_cxxModuleProvider
#define autolinking_registerProviders facebook::react::autolinking_registerProviders

#else  // < 0.75

#include <rncli.h>

#define autolinking_ModuleProvider facebook::react::rncli_ModuleProvider
#define autolinking_cxxModuleProvider facebook::react::rncli_cxxModuleProvider
#define autolinking_registerProviders facebook::react::rncli_registerProviders

#endif  // __has_include(<autolinking.h>)

#endif  // REACTAPP_JNI_AUTOLINKINGCOMPAT_H_
