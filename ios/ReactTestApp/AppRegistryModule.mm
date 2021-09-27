//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import "AppRegistryModule.h"

#import <jsi/jsi.h>

#import <React/RCTBridge.h>

#import "AppRegistry.h"
#import "ReactTestApp-DevSupport.h"

using facebook::jsi::Runtime;

@interface RCTCxxBridge : RCTBridge
@property (nonatomic, readonly) void *runtime;
@end

@implementation RTAAppRegistryModule

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

- (instancetype)init
{
    if (self = [super init]) {
        [NSNotificationCenter.defaultCenter addObserver:self
                                               selector:@selector(javascriptDidLoadNotification:)
                                                   name:RCTJavaScriptDidLoadNotification
                                                 object:nil];
    }
    return self;
}

- (void)javascriptDidLoadNotification:(NSNotification *)note
{
    if (![self.bridge isKindOfClass:[RCTCxxBridge class]] ||
        ![self.bridge respondsToSelector:@selector(runtime)]) {
        return;
    }

    auto runtimePtr = ((RCTCxxBridge *)self.bridge).runtime;
    if (runtimePtr == nullptr) {
        return;
    }

    auto appKeys = ReactTestApp::GetAppKeys(*static_cast<Runtime *>(runtimePtr));
    if (appKeys.empty()) {
        return;
    }

    NSMutableArray *array = [NSMutableArray arrayWithCapacity:appKeys.size()];
    for (const auto &appKey : appKeys) {
        [array addObject:[NSString stringWithUTF8String:appKey.c_str()]];
    }

    [NSNotificationCenter.defaultCenter postNotificationName:ReactTestAppDidRegisterAppsNotification
                                                      object:self
                                                    userInfo:@{@"appKeys": [array copy]}];
}

@end
