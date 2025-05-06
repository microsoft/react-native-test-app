#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

OBJC_EXTERN NSNotificationName const ReactAppDidFinishLaunchingNotification;

OBJC_EXTERN NSNotificationName const ReactAppWillInitializeReactNativeNotification;
OBJC_EXTERN NSNotificationName const ReactAppDidInitializeReactNativeNotification;

OBJC_EXTERN NSNotificationName const ReactAppRuntimeReady;
OBJC_EXTERN NSNotificationName const ReactAppDidRegisterAppsNotification;

OBJC_EXTERN NSNotificationName const ReactAppSceneDidOpenURLNotification;

OBJC_EXTERN NSNotificationName const ReactTestAppDidInitializeNotification
    __deprecated_msg("Use 'ReactAppDidFinishLaunchingNotification' instead");
OBJC_EXTERN NSNotificationName const ReactTestAppWillInitializeReactNativeNotification
    __deprecated_msg("Use 'ReactAppWillInitializeReactNativeNotification' instead");
OBJC_EXTERN NSNotificationName const ReactTestAppDidInitializeReactNativeNotification
    __deprecated_msg("Use 'ReactAppDidInitializeReactNativeNotification' instead");
OBJC_EXTERN NSNotificationName const ReactTestAppDidRegisterAppsNotification
    __deprecated_msg("Use 'ReactAppDidRegisterAppsNotification' instead");
OBJC_EXTERN NSNotificationName const ReactTestAppSceneDidOpenURLNotification
    __deprecated_msg("Use 'ReactAppSceneDidOpenURLNotification' instead");

OBJC_EXTERN NSNotificationName const ReactInstanceDidLoadBundle;

OBJC_EXTERN void RTAPostDidRegisterAppsNotification(NSValue *runtime);
OBJC_EXTERN void RTAPostDidRegisterAppsNotificationWithBridge(id bridge);

NS_ASSUME_NONNULL_END
