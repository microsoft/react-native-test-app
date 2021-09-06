//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

#import "ReactTestAppAppRegistryModule.h"

#include <string>
#include <vector>

#import <jsi/jsi.h>

#import <React/RCTBridge.h>

#import "ReactTestApp-DevSupport.h"

using facebook::jsi::Runtime;
using facebook::jsi::String;

@interface RCTCxxBridge : RCTBridge
@property (nonatomic, readonly) void *runtime;
@end

std::vector<std::string> ReactTestAppGetAppKeys(Runtime &);

@implementation ReactTestAppAppRegistryModule

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE(ReactTestAppAppRegistryModule);

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

    auto appKeys = ReactTestAppGetAppKeys(*static_cast<Runtime *>(runtimePtr));
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

std::vector<std::string> ReactTestAppGetAppKeys(Runtime &runtime)
{
    std::vector<std::string> result;

    constexpr char kFbBatchedBridgeId[] = "__fbBatchedBridge";

    auto global = runtime.global();
    if (!global.hasProperty(runtime, kFbBatchedBridgeId)) {
        return result;
    }

    // const appRegistry = __fbBatchedBridge.getCallableModule("AppRegistry");
    auto fbBatchedBridge = global.getPropertyAsObject(runtime, kFbBatchedBridgeId);
    auto getCallableModule = fbBatchedBridge.getPropertyAsFunction(runtime, "getCallableModule");
    auto appRegistry =
        getCallableModule.callWithThis(runtime, fbBatchedBridge, "AppRegistry").asObject(runtime);

    // const appKeys = appRegistry.getAppKeys();
    auto getAppKeys = appRegistry.getPropertyAsFunction(runtime, "getAppKeys");
    auto appKeys = getAppKeys.callWithThis(runtime, appRegistry).asObject(runtime).asArray(runtime);

    auto length = appKeys.length(runtime);
    result.reserve(length);

    auto logBox = String::createFromAscii(runtime, "LogBox");
    for (size_t i = 0; i < length; ++i) {
        auto value = appKeys.getValueAtIndex(runtime, i);
        if (!value.isString()) {
            continue;
        }

        auto appKey = value.toString(runtime);
        if (String::strictEquals(runtime, appKey, logBox)) {
            // Ignore internal app keys
            continue;
        }

        result.push_back(appKey.utf8(runtime));
    }

    return result;
}
