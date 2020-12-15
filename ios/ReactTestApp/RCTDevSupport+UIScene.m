//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

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

@protocol RCTRedBoxWindowActionDelegate;

// TODO: Re-declared RCTRedBoxWindow here in order to monkey patch in UIScene
//       support. Revisit when we bump React Native.
@interface RCTRedBoxWindow : UIWindow <UITableViewDelegate, UITableViewDataSource>
@property (nonatomic, weak) id<RCTRedBoxWindowActionDelegate> actionDelegate;
- (void)dismiss;
- (void)showErrorMessage:(NSString *)message
               withStack:(NSArray<RCTJSStackFrame *> *)stack
                isUpdate:(BOOL)isUpdate;
@end

@implementation RCTRedBoxWindow (UISceneSupport)

+ (void)load
{
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      Class class = [self class];
      RTASwizzleSelector(class,
                         @selector(showErrorMessage:withStack:isUpdate:),
                         @selector(rta_showErrorMessage:withStack:isUpdate:));
      RTASwizzleSelector(class, @selector(dismiss), @selector(rta_dismiss));
      RTASwizzleSelector(class, @selector(makeKeyAndVisible), @selector(rta_makeKeyAndVisible));
    });
}

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
        [self rta_showErrorMessage:message withStack:stack isUpdate:isUpdate];
    }
}

@end

// MARK: - RCTDevLoadingView

@implementation RCTDevLoadingView (UISceneSupport)

+ (void)initialize
{
    if ([self class] != [RCTDevLoadingView class]) {
        return;
    }

    if (@available(iOS 13.0, *)) {
        RTASwizzleSelector([self class],
                           @selector(showMessage:color:backgroundColor:),
                           @selector(rta_showMessage:color:backgroundColor:));
    }
}

- (void)rta_showMessage:(NSString *)message
                  color:(UIColor *)color
        backgroundColor:(UIColor *)backgroundColor
{
    [self rta_showMessage:message color:color backgroundColor:backgroundColor];
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

#endif  // DEBUG
