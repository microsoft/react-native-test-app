//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import <Foundation/Foundation.h>

@class RCTBridge;

IMP RTASwizzleSelector(Class class, SEL originalSelector, SEL swizzledSelector);

void RTATriggerReloadCommand(RCTBridge *, NSString *reason);
