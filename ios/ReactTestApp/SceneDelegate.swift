import Foundation
import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    private lazy var reactInstance = ReactInstance()

    func sceneDidDisconnect(_ scene: UIScene) {
        // Called as the scene is being released by the system.
        // This occurs shortly after the scene enters the background, or when its session is discarded.
        // Release any resources associated with this scene that can be re-created the next time the scene connects.
        // The scene may re-connect later, as its session was not neccessarily discarded (see
        // `application:didDiscardSceneSessions` instead).
        // sceneDidDisconnect(_:)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Called when the scene has moved from an inactive state to an active state.
        // Use this method to restart any tasks that were paused (or not yet started) when the scene was inactive.
        // sceneDidBecomeActive(_:)
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Called when the scene will move from an active state to an inactive state.
        // This may occur due to temporary interruptions (ex. an incoming phone call).
        // sceneWillResignActive(_:)
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        // Called as the scene transitions from the background to the foreground.
        // Use this method to undo the changes made on entering the background.
        // sceneWillEnterForeground(_:)
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        // Called as the scene transitions from the foreground to the background.
        // Use this method to save data, release shared resources, and store enough scene-specific state information
        // to restore the scene back to its current state.
        // sceneDidEnterBackground(_:)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            RCTLinkingManager.application(
                UIApplication.shared,
                open: context.url,
                options: context.options.dictionary()
            )
        }

        NotificationCenter.default.post(
            name: .ReactTestAppSceneDidOpenURL,
            object: [
                "scene": scene,
                "URLContexts": URLContexts,
            ]
        )

        // scene(_:openURLContexts:)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        // scene(_:continue:)
    }
}

// MARK: - Multi-app extensions

#if !ENABLE_SINGLE_APP_MODE

extension SceneDelegate {
    var isRunningTests: Bool {
        let environment = ProcessInfo.processInfo.environment
        return environment["XCInjectBundleInto"] != nil
    }

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions)
    {
        // Use this method to optionally configure and attach the UIWindow `window` to the provided UIWindowScene
        // `scene`.
        // If using a storyboard, the `window` property will automatically be initialized and attached to the scene.
        // This delegate does not imply the connecting scene or session are new (see
        // `application:configurationForConnectingSceneSession` instead).

        guard !isRunningTests else {
            return
        }

        if let windowScene = scene as? UIWindowScene {
            let window = UIWindow(windowScene: windowScene)
            window.rootViewController = UINavigationController(
                rootViewController: ContentViewController(reactInstance: reactInstance)
            )
            self.window = window
            window.makeKeyAndVisible()
        }

        // scene(_:willConnectTo:options:)
    }
}

#endif // !ENABLE_SINGLE_APP_MODE

// MARK: - Single-app extensions

#if ENABLE_SINGLE_APP_MODE

extension SceneDelegate {
    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions)
    {
        guard let windowScene = scene as? UIWindowScene else {
            assertionFailure("Default scene configuration should have been loaded by now")
            return
        }

        guard let (rootView, _) = createReactRootView(reactInstance) else {
            assertionFailure()
            return
        }

        rootView.backgroundColor = UIColor.systemBackground

        let viewController = UIViewController(nibName: nil, bundle: nil)
        viewController.view = rootView

        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = viewController
        self.window = window

        window.makeKeyAndVisible()

        // scene(_:willConnectTo:options:)
    }
}

#endif // ENABLE_SINGLE_APP_MODE

// MARK: - UIScene.OpenURLOptions extensions

extension UIScene.OpenURLOptions {
    func dictionary() -> [UIApplication.OpenURLOptionsKey: Any] {
        var options: [UIApplication.OpenURLOptionsKey: Any] = [:]

        if let sourceApplication = sourceApplication {
            options[.sourceApplication] = sourceApplication
        }

        if let annotation = annotation {
            options[.annotation] = annotation
        }

        options[.openInPlace] = openInPlace

        if #available(iOS 14.5, *) {
            if let eventAttribution = eventAttribution {
                options[.eventAttribution] = eventAttribution
            }
        }

        return options
    }
}
