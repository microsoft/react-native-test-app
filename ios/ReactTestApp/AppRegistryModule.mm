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

@implementation RTAAppRegistryModule

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
    id bridge = note.userInfo[@"bridge"];
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

        auto appKeys = ReactTestApp::GetAppKeys(*runtime);
        if (appKeys.empty()) {
            return;
        }

        NSMutableArray *array = [NSMutableArray arrayWithCapacity:appKeys.size()];
        for (const auto &appKey : appKeys) {
            [array addObject:[NSString stringWithUTF8String:appKey.c_str()]];
        }

        [NSNotificationCenter.defaultCenter
            postNotificationName:ReactTestAppDidRegisterAppsNotification
                          object:nil
                        userInfo:@{@"appKeys": [array copy]}];
    }];
}

@end
