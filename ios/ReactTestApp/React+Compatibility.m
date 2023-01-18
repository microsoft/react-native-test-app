#import "React+Compatibility.h"

#include <TargetConditionals.h>

#import <objc/runtime.h>

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

// MARK: - [0.70.0] Alerts don't show when using UIScene
// See https://github.com/facebook/react-native/pull/35716

#if !TARGET_OS_OSX && REACT_NATIVE_VERSION < 7200

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

#endif  // !TARGET_OS_OSX && REACT_NATIVE_VERSION < 7100
