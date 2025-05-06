#import <Foundation/Foundation.h>

NSNotificationName const ReactAppDidInitializeNotification = @"ReactAppDidInitializeNotification";
NSNotificationName const ReactAppWillInitializeReactNativeNotification =
    @"ReactAppWillInitializeReactNativeNotification";
NSNotificationName const ReactAppDidInitializeReactNativeNotification =
    @"ReactAppDidInitializeReactNativeNotification";
NSNotificationName const ReactAppDidRegisterAppsNotification =
    @"ReactAppDidRegisterAppsNotification";
NSNotificationName const ReactAppRuntimeReady = @"ReactAppRuntimeReady";
NSNotificationName const ReactAppSceneDidOpenURLNotification =
    @"ReactAppSceneDidOpenURLNotification";

NSNotificationName const ReactTestAppDidInitializeNotification = ReactAppDidInitializeNotification;
NSNotificationName const ReactTestAppWillInitializeReactNativeNotification =
    ReactAppWillInitializeReactNativeNotification;
NSNotificationName const ReactTestAppDidInitializeReactNativeNotification =
    ReactAppDidInitializeReactNativeNotification;
NSNotificationName const ReactTestAppDidRegisterAppsNotification =
    ReactAppDidRegisterAppsNotification;
NSNotificationName const ReactTestAppSceneDidOpenURLNotification =
    ReactAppSceneDidOpenURLNotification;

// https://github.com/facebook/react-native/blob/v0.73.4/packages/react-native/ReactCommon/react/runtime/platform/ios/ReactCommon/RCTInstance.mm#L448
NSNotificationName const ReactInstanceDidLoadBundle = @"RCTInstanceDidLoadBundle";
