#import "React+Compatibility.h"

#include <TargetConditionals.h>

#import <objc/runtime.h>

#import <React/RCTBridge.h>

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

// MARK: - [0.63.2] Images do not render on iOS 14
// See https://github.com/facebook/react-native/pull/29420

#if !TARGET_OS_OSX && REACT_NATIVE_VERSION < 6302

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullability-completeness"
#import <React/RCTUIImageViewAnimated.h>
#pragma clang diagnostic pop

@implementation RCTUIImageViewAnimated (ReactTestApp)

static void (*orig_displayLayer)(id, SEL, CALayer *);

+ (void)initialize
{
    if ([self class] != [RCTUIImageViewAnimated class]) {
        return;
    }

    if (@available(iOS 14.0, *)) {
        static dispatch_once_t onceToken;
        dispatch_once(&onceToken, ^{
          IMP impl = RTASwizzleSelector(
              [self class], @selector(displayLayer:), @selector(rta_displayLayer:));
          orig_displayLayer = (void (*)(id, SEL, CALayer *))impl;
        });
    }
}

- (void)rta_displayLayer:(CALayer *)layer
{
    /* The fix for images not rendering is to let UIImageView handle it when we
     * are not animating. The following change was made in react-native#29420:
     *
     * diff --git a/Libraries/Image/RCTUIImageViewAnimated.m b/Libraries/Image/RCTUIImageViewAnimated.m
     * index 93c6a2f02f5..f6fb5bc60cc 100644
     * --- a/Libraries/Image/RCTUIImageViewAnimated.m
     * +++ b/Libraries/Image/RCTUIImageViewAnimated.m
     * @@ -285,6 +285,8 @@ static NSUInteger RCTDeviceFreeMemory() {
     *    if (_currentFrame) {
     *      layer.contentsScale = self.animatedImageScale;
     *      layer.contents = (__bridge id)_currentFrame.CGImage;
     * +  } else {
     * +    [super displayLayer:layer];
     *    }
     *  }
     *
     * The patch calls `super` when `_currentFrame` is `nil`. For our monkey
     * patch, we'll invert the logic to let the original method handle the case
     * where `_currentFrame` is missing.
     */
    if ([self respondsToSelector:@selector(currentFrame)] &&
        [self performSelector:@selector(currentFrame)] == nil) {
        [super displayLayer:layer];
    } else {
        orig_displayLayer(self, @selector(displayLayer:), layer);
    }
}

@end

#endif  // !TARGET_OS_OSX && REACT_NATIVE_VERSION < 6302

// MARK: - [0.70.0] Alerts don't show when using UIScene
// See https://github.com/facebook/react-native/pull/34562

#if !TARGET_OS_OSX && REACT_NATIVE_VERSION < 7100

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
