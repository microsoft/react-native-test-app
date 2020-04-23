//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#include <TargetConditionals.h>
#if TARGET_OS_IOS
#import <UIKit/UIViewController.h>
#define RTAViewController UIViewController
#else
#import <AppKit/NSViewController.h>
#define RTAViewController NSViewController
#endif

@class RCTBridge;

NS_ASSUME_NONNULL_BEGIN

RTAViewController *_Nullable RTAViewControllerFromString(NSString *name, RCTBridge *bridge);

NS_ASSUME_NONNULL_END
