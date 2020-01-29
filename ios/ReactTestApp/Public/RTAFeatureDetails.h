/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTBridge.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

extern NSString *const RTAFeatureSceneDidOpenURLNotification;

@protocol RTAFeatureDetails <NSObject>

@property (nonatomic, readonly) NSString *name;

- (instancetype)initWithBridge:(RCTBridge *)bridge;
- (UIViewController *)viewControllerWithBridge:(RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END
