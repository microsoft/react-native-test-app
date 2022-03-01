#import "React+TurboModule.h"

#if USE_TURBOMODULE

#import <React/CoreModulesPlugins.h>
#import <React/RCTAppSetupUtils.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTDataRequestHandler.h>
#import <React/RCTFileRequestHandler.h>
#import <React/RCTGIFImageDecoder.h>
#import <React/RCTHTTPRequestHandler.h>
#import <React/RCTImageLoader.h>
#import <React/RCTJSIExecutorRuntimeInstaller.h>
#import <React/RCTLocalAssetImageLoader.h>
#import <React/RCTNetworking.h>
#import <ReactCommon/RCTTurboModuleManager.h>

@interface RTATurboModuleManagerDelegate () <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate>
@end

@implementation RTATurboModuleManagerDelegate {
    __weak id<RCTBridgeDelegate> _bridgeDelegate;
    RCTTurboModuleManager *_turboModuleManager;
}

- (instancetype)initWithBridgeDelegate:(id<RCTBridgeDelegate>)bridgeDelegate
{
    if (self = [super init]) {
        _bridgeDelegate = bridgeDelegate;
    }
    return self;
}

// MARK: - RCTBridgeDelegate details

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
    return [_bridgeDelegate sourceURLForBridge:bridge];
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
    return [_bridgeDelegate extraModulesForBridge:bridge];
}

// MARK: - RCTCxxBridgeDelegate details

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge
{
    if (_turboModuleManager == nil) {
        _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                                   delegate:self
                                                                  jsInvoker:bridge.jsCallInvoker];
    }
    return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
}

// MARK: - RCTTurboModuleManagerDelegate details

- (Class)getModuleClassFromName:(const char *)name
{
    return RCTCoreModulesClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const std::string &)name
         jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
    return nullptr;
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
    return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

@end

#endif  // USE_TURBOMODULE
