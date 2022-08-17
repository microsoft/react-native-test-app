#import "AppRegistryModule.h"

#import <jsi/jsi.h>

#import <React/RCTBridge.h>
#import <ReactCommon/RuntimeExecutor.h>

#import "AppRegistry.h"
#import "ReactTestApp-DevSupport.h"

using facebook::jsi::Runtime;
using facebook::react::RuntimeExecutor;

extern RuntimeExecutor RCTRuntimeExecutorFromBridge(RCTBridge *bridge);

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
    auto executor = RCTRuntimeExecutorFromBridge(self.bridge);
    executor([](Runtime &runtime) {
        auto appKeys = ReactTestApp::GetAppKeys(runtime);
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
    });
}

@end
