#import "AppRegistryModule.h"

#import <jsi/jsi.h>

#import <React/RCTBridge.h>

#import "AppRegistry.h"
#import "ReactTestApp-DevSupport.h"

using facebook::jsi::Runtime;

@interface RCTCxxBridge : RCTBridge
@property (nonatomic, readonly) void *runtime;
- (void)invokeAsync:(std::function<void()> &&)func;
@end

void RTAPostDidRegisterAppsNotification(NSValue *value)
{
    auto runtime = static_cast<Runtime *>([value pointerValue]);
    auto appKeys = ReactTestApp::GetAppKeys(*runtime);
    if (appKeys.empty()) {
        return;
    }

    NSMutableArray *array = [NSMutableArray arrayWithCapacity:appKeys.size()];
    for (const auto &appKey : appKeys) {
        [array addObject:[NSString stringWithUTF8String:appKey.c_str()]];
    }

    [NSNotificationCenter.defaultCenter postNotificationName:ReactAppDidRegisterAppsNotification
                                                      object:nil
                                                    userInfo:@{@"appKeys": [array copy]}];
}

void RTAPostDidRegisterAppsNotificationWithBridge(id bridge)
{
    if (![bridge isKindOfClass:[RCTCxxBridge class]] ||
        ![bridge respondsToSelector:@selector(runtime)] ||
        ![bridge respondsToSelector:@selector(invokeAsync:)]) {
        return;
    }

    RCTCxxBridge *batchedBridge = (RCTCxxBridge *)bridge;
    [batchedBridge invokeAsync:[batchedBridge] {
        auto runtime = static_cast<Runtime *>(batchedBridge.runtime);
        if (runtime == nullptr) {
            return;
        }

        RTAPostDidRegisterAppsNotification([NSValue valueWithPointer:runtime]);
    }];
}
