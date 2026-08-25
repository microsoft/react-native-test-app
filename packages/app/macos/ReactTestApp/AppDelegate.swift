import Cocoa
import ReactTestApp_DevSupport
import SwiftUI

// MARK: - App

@main
struct ReactTestAppMain: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        Window("ReactTestApp", id: AppDelegate.mainWindowID) {
            content
        }
        .defaultSize(width: 640, height: 480)
        .commands {
            #if !ENABLE_SINGLE_APP_MODE || DEBUG
            ReactCommands(model: appDelegate.model)
            #endif
        }
    }

    @ViewBuilder
    private var content: some View {
        #if ENABLE_SINGLE_APP_MODE
        SingleAppContentView(reactInstance: appDelegate.model.reactInstance)
        #else
        MultiAppRootView(presenter: appDelegate.presenter)
        #endif
    }
}

// MARK: - App Delegate

final class AppDelegate: NSObject, NSApplicationDelegate {
    static let mainWindowID = "MainWindow"

    let model: AppModel

    #if !ENABLE_SINGLE_APP_MODE
    let presenter: MacOSComponentPresenter
    #endif

    override init() {
        let reactInstance = ReactInstance()
        model = AppModel(reactInstance: reactInstance)

        #if !ENABLE_SINGLE_APP_MODE
        presenter = MacOSComponentPresenter(windowTitle: Manifest.load().displayName)
        super.init()
        presenter.reactInstance = reactInstance
        model.presenter = presenter
        #else
        super.init()
        #endif
    }

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool {
        true
    }

    func applicationWillFinishLaunching(_: Notification) {
        #if ENABLE_SINGLE_APP_MODE
        // applicationWillFinishLaunching(_:) [ENABLE_SINGLE_APP_MODE=1]
        #else
        // applicationWillFinishLaunching(_:) [ENABLE_SINGLE_APP_MODE=0]
        #endif
    }

    func applicationDidFinishLaunching(_: Notification) {
        NotificationCenter.default.post(
            name: .ReactAppDidFinishLaunching,
            object: nil
        )

        model.initialize()

        NSApplication.shared.activate(ignoringOtherApps: true)

        // applicationDidFinishLaunching(_:)
    }

    func applicationWillTerminate(_: Notification) {
        // applicationWillTerminate(_:)
    }

    // MARK: Push Notifications

    func application(_ application: NSApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data)
    {
        // application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
    }

    func application(_ application: NSApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error)
    {
        // application(_:didFailToRegisterForRemoteNotificationsWithError:)
    }

    func application(_ application: NSApplication,
                     didReceiveRemoteNotification userInfo: [String: Any])
    {
        // application(_:didReceiveRemoteNotification:)
    }
}

// MARK: - NSRect extensions

extension NSRect {
    init(size: CGSize) {
        self.init(x: 0, y: 0, width: size.width, height: size.height)
    }
}
