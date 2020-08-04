//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import "UIViewController+ReactTestApp.h"

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
