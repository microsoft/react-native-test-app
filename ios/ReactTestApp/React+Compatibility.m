// Disable clang-format because it gets confused when there's a "+" in the
// filename.
// clang-format off
#import "React+Compatibility.h"
// clang-format on

#include <TargetConditionals.h>

#import <objc/runtime.h>

#import <React/RCTBundleURLProvider.h>

#define MAKE_VERSION(maj, min, patch) ((maj * 1000000) + (min * 1000) + patch)

#if REACT_NATIVE_VERSION < MAKE_VERSION(0, 79, 0)
#import <React/RCTDevSettings.h>
#endif

IMP RTASwizzleSelector(Class class, SEL originalSelector, SEL swizzledSelector)
{
    Method originalMethod = class_getInstanceMethod(class, originalSelector);
    IMP originalImpl = method_getImplementation(originalMethod);

    Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);

    BOOL didAddMethod = class_addMethod(class,
                                        originalSelector,
                                        method_getImplementation(swizzledMethod),
                                        method_getTypeEncoding(swizzledMethod));
    if (didAddMethod) {
        const char *type = method_getTypeEncoding(originalMethod);
        class_replaceMethod(class, swizzledSelector, originalImpl, type);
    } else {
        method_exchangeImplementations(originalMethod, swizzledMethod);
    }

    return originalImpl;
}

// MARK: - [0.79.0] `isDebuggingRemotely` was removed
// See https://github.com/facebook/react-native/commit/9aae84a688b5af87faf4b68676b6357de26f797f

void RTADisableRemoteDebugging()
{
#if REACT_NATIVE_VERSION < MAKE_VERSION(0, 79, 0)
    [[RCTDevSettings alloc] init].isDebuggingRemotely = NO;
#endif
}

NSURL *RTADefaultJSBundleURL()
{
    return [RCTBundleURLProvider jsBundleURLForBundleRoot:@"index"
                                             packagerHost:@"localhost"
                                                enableDev:YES
                                       enableMinification:NO
                                          inlineSourceMap:YES];
}
