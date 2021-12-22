#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

#import <React/RCTDevLoadingView.h>
#import <React/RCTJSStackFrame.h>
#import <React/RCTUtils.h>
#import <React/RCTVersion.h>

#import "React+Compatibility.h"

#if DEBUG

// MARK: - RCTRedBoxWindow

// MARK: - [0.64] `RCTRedBox` doesn't appear in apps implementing `UISceneDelegate`
// https://github.com/facebook/react-native/commit/46c77dc296dfab754356cd9346a01dae8d4869f4

#if REACT_NATIVE_VERSION < 6400

// MARK: - [0.63] `RCTRedBox` doesn't appear in apps implementing `UISceneDelegate`
// https://github.com/facebook/react-native/commit/d0a32c2011ca00991be45ac3fa320f4fc663b2e8

@protocol RCTRedBoxWindowActionDelegate;

@interface RCTRedBoxWindow : UIWindow <UITableViewDelegate, UITableViewDataSource>
@property (nonatomic, strong) UIViewController *rootViewController;
@property (nonatomic, weak) id<RCTRedBoxWindowActionDelegate> actionDelegate;

- (void)dismiss;

// showErrorMessage:withStack:isUpdate: was renamed showErrorMessage:withStack:isUpdate:errorCookie:
// https://github.com/facebook/react-native/commit/850a8352c91f10842d84c3e811cf6e2a0927f349
#if REACT_NATIVE_VERSION < 6200
- (void)showErrorMessage:(NSString *)message
               withStack:(NSArray<RCTJSStackFrame *> *)stack
                isUpdate:(BOOL)isUpdate;
#else
- (void)showErrorMessage:(NSString *)message
               withStack:(NSArray<RCTJSStackFrame *> *)stack
                isUpdate:(BOOL)isUpdate
             errorCookie:(int)errorCookie;
#endif
@end

@implementation RCTRedBoxWindow (UISceneSupport)

#if REACT_NATIVE_VERSION < 6200
static void (*orig_showErrorMessage)(id, SEL, NSString *, NSArray<RCTJSStackFrame *> *, BOOL);
#else
static void (*orig_showErrorMessage)(id, SEL, NSString *, NSArray<RCTJSStackFrame *> *, BOOL, int);
#endif

+ (void)load
{
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      Class class = [self class];

#if REACT_NATIVE_VERSION < 6200
      orig_showErrorMessage =
          (void (*)(id, SEL, NSString *, NSArray<RCTJSStackFrame *> *, BOOL))RTASwizzleSelector(
              class,
              @selector(showErrorMessage:withStack:isUpdate:),
              @selector(rta_showErrorMessage:withStack:isUpdate:));
#else
      orig_showErrorMessage =
          (void (*)(id, SEL, NSString *, NSArray<RCTJSStackFrame *> *, BOOL, int))
              RTASwizzleSelector(class,
                                 @selector(showErrorMessage:withStack:isUpdate:errorCookie:),
                                 @selector(rta_showErrorMessage:withStack:isUpdate:errorCookie:));
#endif  // REACT_NATIVE_VERSION < 6200
#if REACT_NATIVE_VERSION < 6300
      RTASwizzleSelector(class, @selector(dismiss), @selector(rta_dismiss));
      RTASwizzleSelector(class, @selector(makeKeyAndVisible), @selector(rta_makeKeyAndVisible));
#endif  // REACT_NATIVE_VERSION < 6300
    });
}

#if REACT_NATIVE_VERSION < 6300
- (void)rta_makeKeyAndVisible
{
    // Manually adding the rootViewController's view to the view hierarchy is no
    // longer supported. Overriding to allow UIWindow to add the
    // rootViewController's view to the view hierarchy itself.
}

- (void)rta_dismiss
{
    [self.rootViewController dismissViewControllerAnimated:YES completion:nil];
}
#endif  // REACT_NATIVE_VERSION < 6300

#if REACT_NATIVE_VERSION < 6200
- (void)rta_showErrorMessage:(NSString *)message
                   withStack:(NSArray<RCTJSStackFrame *> *)stack
                    isUpdate:(BOOL)isUpdate
{
    if (self.rootViewController.presentingViewController == nil) {
        self.rootViewController.view.backgroundColor = UIColor.blackColor;
        [RCTSharedApplication().delegate.window.rootViewController
            presentViewController:self.rootViewController
                         animated:NO
                       completion:nil];
        orig_showErrorMessage(
            self, @selector(showErrorMessage:withStack:isUpdate:), message, stack, isUpdate);
    }
}
#else
- (void)rta_showErrorMessage:(NSString *)message
                   withStack:(NSArray<RCTJSStackFrame *> *)stack
                    isUpdate:(BOOL)isUpdate
                 errorCookie:(int)errorCookie
{
#if REACT_NATIVE_VERSION < 6300
    if (self.rootViewController.presentingViewController == nil) {
        self.rootViewController.view.backgroundColor = UIColor.blackColor;
        [RCTSharedApplication().delegate.window.rootViewController
            presentViewController:self.rootViewController
                         animated:NO
                       completion:nil];
    }
#endif  // REACT_NATIVE_VERSION < 6300
    orig_showErrorMessage(self,
                          @selector(showErrorMessage:withStack:isUpdate:),
                          message,
                          stack,
                          isUpdate && self.rootViewController.presentingViewController != nil,
                          errorCookie);
}
#endif  // REACT_NATIVE_VERSION < 6200

@end

#endif  // REACT_NATIVE_VERSION < 6400

// MARK: - [0.63] RCTDevLoadingView doesn't show up with UIScene
// https://github.com/facebook/react-native/commit/74b667dbc2a48183dec0b9c3b5401bc3f9e54e7b

#if REACT_NATIVE_VERSION < 6300
@implementation RCTDevLoadingView (UISceneSupport)

static void (*orig_showMessage)(id, SEL, NSString *, UIColor *, UIColor *);

+ (void)initialize
{
    if ([self class] != [RCTDevLoadingView class]) {
        return;
    }

    if (@available(iOS 13.0, *)) {
        orig_showMessage = (void (*)(id, SEL, NSString *, UIColor *, UIColor *))RTASwizzleSelector(
            [self class],
            @selector(showMessage:color:backgroundColor:),
            @selector(rta_showMessage:color:backgroundColor:));
    }
}

- (void)rta_showMessage:(NSString *)message
                  color:(UIColor *)color
        backgroundColor:(UIColor *)backgroundColor
{
    orig_showMessage(
        self, @selector(showMessage:color:backgroundColor:), message, color, backgroundColor);
    if (@available(iOS 13.0, *)) {
        dispatch_async(dispatch_get_main_queue(), ^{
          Ivar _window = class_getInstanceVariable([self class], [@"_window" UTF8String]);
          id window = object_getIvar(self, _window);
          if ([window isKindOfClass:[UIWindow class]]) {
              UIWindowScene *scene =
                  (UIWindowScene *)UIApplication.sharedApplication.connectedScenes.anyObject;
              [window setWindowScene:scene];
          }
        });
    }
}

@end
#endif  // REACT_NATIVE_VERSION < 6300

#endif  // DEBUG
