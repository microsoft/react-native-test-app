/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>
#import <React/RCTJSStackFrame.h>
#import <React/RCTUtils.h>
#import <React/RCTVersion.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

#if DEBUG

void swizzleSelector(Class class, SEL originalSelector, SEL swizzledSelector)
{
    Method originalMethod = class_getInstanceMethod(class, originalSelector);
    Method swizzledMethod = class_getInstanceMethod(class, swizzledSelector);

    BOOL didAddMethod = class_addMethod(class,
                                        originalSelector,
                                        method_getImplementation(swizzledMethod),
                                        method_getTypeEncoding(swizzledMethod));
    if (didAddMethod)
    {
        class_replaceMethod(class,
                            swizzledSelector,
                            method_getImplementation(originalMethod),
                            method_getTypeEncoding(originalMethod));
    }
    else
    {
        method_exchangeImplementations(originalMethod, swizzledMethod);
    }
}

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
      swizzleSelector(class,
                      @selector(showErrorMessage:withStack:isUpdate:),
                      @selector(rta_showErrorMessage:withStack:isUpdate:));
      swizzleSelector(class, @selector(dismiss), @selector(rta_dismiss));
    });
}

- (void)rta_dismiss
{
    [self.rootViewController dismissViewControllerAnimated:YES completion:nil];
}

- (void)rta_showErrorMessage:(NSString *)message
                   withStack:(NSArray<RCTJSStackFrame *> *)stack
                    isUpdate:(BOOL)isUpdate
{
    if (!self.isKeyWindow)
    {
        self.rootViewController.view.backgroundColor = UIColor.blackColor;
        [RCTSharedApplication().delegate.window.rootViewController
            presentViewController:self.rootViewController
                         animated:NO
                       completion:nil];
        [self rta_showErrorMessage:message withStack:stack isUpdate:isUpdate];
    }
}

@end

#endif  // DEBUG
