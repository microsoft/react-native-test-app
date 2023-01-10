#import "React+Fabric.h"

#ifdef USE_FABRIC
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <react/config/ReactNativeConfig.h>
#else
#import <React/RCTRootView.h>
#endif  // USE_FABRIC

RTAView *RTACreateReactRootView(RCTBridge *bridge,
                                NSString *moduleName,
                                NSDictionary *initialProperties)
{
#ifdef USE_FABRIC
    return [[RCTFabricSurfaceHostingProxyRootView alloc] initWithBridge:bridge
                                                             moduleName:moduleName
                                                      initialProperties:initialProperties];
#else
    return [[RCTRootView alloc] initWithBridge:bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
#endif  // USE_FABRIC
}

NSObject *RTACreateSurfacePresenterBridgeAdapter(RCTBridge *bridge)
{
#ifdef USE_FABRIC
    auto contextContainer = std::make_shared<facebook::react::ContextContainer const>();
    auto reactNativeConfig = std::make_shared<facebook::react::EmptyReactNativeConfig const>();
    contextContainer->insert("ReactNativeConfig", reactNativeConfig);

    auto bridgeAdapter = [[RCTSurfacePresenterBridgeAdapter alloc] initWithBridge:bridge
                                                                 contextContainer:contextContainer];
    bridge.surfacePresenter = bridgeAdapter.surfacePresenter;
    return bridgeAdapter;
#else
    return nil;
#endif  // USE_FABRIC
}
