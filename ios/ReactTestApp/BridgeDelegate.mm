#import "BridgeDelegate.h"

#import <React/RCTCxxBridgeDelegate.h>

#if USE_TURBOMODULE
#import <React/CoreModulesPlugins.h>
#import <React/RCTAppSetupUtils.h>
#import <ReactCommon/RCTTurboModuleManager.h>

@interface RTABridgeDelegate () <RCTCxxBridgeDelegate, RCTTurboModuleManagerDelegate>
@end
#else
@interface RTABridgeDelegate () <RCTCxxBridgeDelegate>
@end
#endif  // USE_TURBOMODULE

@implementation RTABridgeDelegate {
    __weak id<RCTBridgeDelegate> _bridgeDelegate;
#if USE_TURBOMODULE
    RCTTurboModuleManager *_turboModuleManager;
#endif  // USE_TURBOMODULE
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
#if USE_TURBOMODULE
    // jsExecutorFactoryForBridge: (USE_TURBOMODULE=1)
    _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                               delegate:self
                                                              jsInvoker:bridge.jsCallInvoker];
    return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
#else
    // jsExecutorFactoryForBridge: (USE_TURBOMODULE=0)
    return nullptr;
#endif  // USE_TURBOMODULE
}

// MARK: - RCTTurboModuleManagerDelegate details
#if USE_TURBOMODULE

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

#endif  // USE_TURBOMODULE

@end
