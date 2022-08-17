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
        ![self.bridge respondsToSelector:@selector(runtime)] ||
        ![self.bridge respondsToSelector:@selector(invokeAsync:)]) {
        return;
    }

    auto batchedBridge = (RCTCxxBridge *)self.bridge;
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
