// Disable clang-format because it gets confused when there's a "+" in the
// filename.
// clang-format off
#import "React+Compatibility.h"
// clang-format on

#include <TargetConditionals.h>

#import <objc/runtime.h>

#import <React/RCTBundleURLProvider.h>

#define MAKE_VERSION(maj, min, patch) ((maj * 1000000) + (min * 1000) + patch)

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

// MARK: - [0.71.13] The additional `inlineSourceMap:` was added in 0.71.13
// See https://github.com/facebook/react-native/commit/f7219ec02d71d2f0f6c71af4d5c3d4850a898fd8

NSURL *RTADefaultJSBundleURL()
{
#if REACT_NATIVE_VERSION < MAKE_VERSION(0, 71, 13)
    return [RCTBundleURLProvider jsBundleURLForBundleRoot:@"index"
                                             packagerHost:@"localhost"
                                                enableDev:YES
                                       enableMinification:NO];
#else
    return [RCTBundleURLProvider jsBundleURLForBundleRoot:@"index"
                                             packagerHost:@"localhost"
                                                enableDev:YES
                                       enableMinification:NO
                                          inlineSourceMap:YES];
#endif
}

// MARK: - [0.70.0] Alerts don't show when using UIScene
// See https://github.com/facebook/react-native/pull/35716

#if !TARGET_OS_OSX && REACT_NATIVE_VERSION < MAKE_VERSION(0, 72, 0)

#import <React/RCTAlertController.h>
#import <React/RCTUtils.h>

@implementation RCTAlertController (ReactTestApp)

+ (void)initialize
{
    if ([self class] != [RCTAlertController class]) {
        return;
    }

    if (@available(iOS 13.0, *)) {
        static dispatch_once_t onceToken;
        dispatch_once(&onceToken, ^{
          RTASwizzleSelector([self class], @selector(hide), @selector(rta_hide));
          RTASwizzleSelector(
              [self class], @selector(show:completion:), @selector(rta_show:completion:));
        });
    }
}

- (void)rta_hide
{
    // noop
}

- (void)rta_show:(BOOL)animated completion:(void (^)(void))completion
{
    [[RCTKeyWindow() rootViewController] presentViewController:self
                                                      animated:animated
                                                    completion:completion];
}

@end

#endif  // !TARGET_OS_OSX && REACT_NATIVE_VERSION < 0.72.0
