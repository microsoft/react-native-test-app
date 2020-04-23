//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import "UIViewController+ReactTestApp.h"

NSNotificationName const ReactTestAppDidInitializeNotification =
    @"ReactTestAppDidInitializeNotification";
NSNotificationName const ReactTestAppSceneDidOpenURLNotification =
    @"ReactTestAppSceneDidOpenURLNotification";

@protocol RTAViewController <NSObject>
- (instancetype)initWithBridge:(RCTBridge *)bridge;
@end

RTAViewController *RTAViewControllerFromString(NSString *name, RCTBridge *bridge)
{
    Class viewController = NSClassFromString(name);
    return [viewController instancesRespondToSelector:@selector(initWithBridge:)]
               ? [[viewController alloc] initWithBridge:bridge]
               : nil;
}
