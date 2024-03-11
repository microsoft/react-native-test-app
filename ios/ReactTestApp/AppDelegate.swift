import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    private weak var application: UIApplication?

    @objc var window: UIWindow? {
        get {
            // Copy the implementation of RCTKeyWindow() as it changes a lot upstream
            for scene in RCTSharedApplication()?.connectedScenes {
                guard scene is UIScene, scene.activationState == .foregroundActive else {
                  continue
                }
                let windowScene = scene as UIWindowScene
                windowScene.windows.forEach { window in
                    if window.isKeyWindow {
                        return window
                    }
                }
            }
        }
        // swiftlint:disable:next unused_setter_value
        set {}
    }

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool
    {
        self.application = application

        defer {
            NotificationCenter.default.post(
                name: .ReactTestAppDidInitialize,
                object: nil
            )
        }

        // application(_:didFinishLaunchingWithOptions:)

        return true
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // applicationWillTerminate(_:)
    }

    // MARK: Push Notifications

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data)
    {
        // application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error)
    {
        // application(_:didFailToRegisterForRemoteNotificationsWithError:)
    }

    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void)
    {
        // application(_:didReceiveRemoteNotification:fetchCompletionHandler:)
    }

    // MARK: UISceneSession Support

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration
    {
        // Called when a new scene session is being created.
        // Use this method to select a configuration to create the new scene with.
        UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication,
                     didDiscardSceneSessions sceneSessions: Set<UISceneSession>)
    {
        // Called when the user discards a scene session.
        // If any sessions were discarded while the application was not running, this will be called shortly after
        // application:didFinishLaunchingWithOptions.
        // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
    }
}
