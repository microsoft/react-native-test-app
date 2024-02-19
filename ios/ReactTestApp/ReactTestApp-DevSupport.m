#import <Foundation/Foundation.h>

NSNotificationName const ReactTestAppDidInitializeNotification =
    @"ReactTestAppDidInitializeNotification";

NSNotificationName const ReactTestAppWillInitializeReactNativeNotification =
    @"ReactTestAppWillInitializeReactNativeNotification";
NSNotificationName const ReactTestAppDidInitializeReactNativeNotification =
    @"ReactTestAppDidInitializeReactNativeNotification";
NSNotificationName const ReactTestAppDidRegisterAppsNotification =
    @"ReactTestAppDidRegisterAppsNotification";

NSNotificationName const ReactTestAppSceneDidOpenURLNotification =
    @"ReactTestAppSceneDidOpenURLNotification";

// https://github.com/facebook/react-native/blob/v0.73.4/packages/react-native/ReactCommon/react/runtime/platform/ios/ReactCommon/RCTInstance.mm#L448
NSNotificationName const ReactInstanceDidLoadBundle = @"RCTInstanceDidLoadBundle";
