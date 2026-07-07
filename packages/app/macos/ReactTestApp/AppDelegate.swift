import Cocoa
import ReactTestApp_DevSupport
import SwiftUI

// MARK: - App

@main
struct ReactTestAppMain: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        Window("ReactTestApp", id: AppModel.mainWindowID) {
            RootContentView(model: appDelegate.model)
        }
        .defaultSize(width: 640, height: 480)
        .commands {
            #if !ENABLE_SINGLE_APP_MODE || DEBUG
            ReactCommands(model: appDelegate.model)
            #endif
        }
    }
}

// MARK: - App Delegate

final class AppDelegate: NSObject, NSApplicationDelegate {
    let model = AppModel()

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

// MARK: - App Model

final class AppModel: ObservableObject {
    static let mainWindowID = "MainWindow"

    @Published var windowTitle: String
    @Published var components: [Component] = []
    @Published var componentsEnabled = false
    @Published var contentViewController: NSViewController?
    @Published var rememberLastComponent: Bool {
        didSet { Session.shouldRememberLastComponent = rememberLastComponent }
    }

    private(set) lazy var reactInstance = ReactInstance()

    private var registerAppsToken: NSObjectProtocol?
    private var contentDidAppearToken: NSObjectProtocol?

    private enum WindowSize {
        static let modalSize = CGSize(width: 586, height: 326)
    }

    init() {
        rememberLastComponent = Session.shouldRememberLastComponent

        #if ENABLE_SINGLE_APP_MODE
        let manifest = Manifest.load()
        if let slug = manifest.singleApp,
           let component = manifest.components?.first(where: { $0.slug == slug })
        {
            windowTitle = component.displayName ?? component.appKey
        } else {
            windowTitle = manifest.displayName
        }
        #else
        windowTitle = Manifest.load().displayName
        #endif
    }

    func loadEmbeddedBundle() {
        reactInstance.remoteBundleURL = nil
    }

    func loadFromDevServer() {
        reactInstance.remoteBundleURL = ReactInstance.jsBundleURL()
    }
}

// MARK: - Multi-app extensions

#if !ENABLE_SINGLE_APP_MODE

extension AppModel {
    func initialize() {
        let manifest = Manifest.load()
        windowTitle = manifest.displayName

        let appComponents = manifest.components ?? []
        if appComponents.isEmpty {
            registerAppsToken = NotificationCenter.default.addObserver(
                forName: .ReactAppDidRegisterApps,
                object: nil,
                queue: .main,
                using: { [weak self] note in
                    guard let strongSelf = self,
                          let appKeys = note.userInfo?["appKeys"] as? [String]
                    else {
                        return
                    }

                    let registered = appKeys.map { Component(appKey: $0) }
                    strongSelf.setComponents(registered, enable: true)
                    if registered.count == 1, strongSelf.contentViewController == nil {
                        strongSelf.present(registered[0])
                    }
                }
            )
        }

        setComponents(appComponents, enable: false)

        let bundleRoot = manifest.bundleRoot
        // As of 0.74, we can no longer instantiate on a background thread:
        // https://github.com/facebook/react-native/commit/b7025fe1569349d90d26821b2b8de64a8ec9f352
        DispatchQueue.main.async { [weak self] in
            self?.reactInstance.initReact(bundleRoot: bundleRoot) {
                DispatchQueue.main.async { [weak self] in
                    guard let strongSelf = self, !appComponents.isEmpty else {
                        return
                    }

                    if let index = appComponents.count == 1 ? 0 : Session.lastOpenedComponent(Manifest.checksum()) {
                        strongSelf.present(appComponents[index])
                    }

                    strongSelf.componentsEnabled = true
                }
            }
        }
    }

    func selectComponent(_ component: Component, at index: Int) {
        present(component)
        Session.storeComponent(index: index, checksum: Manifest.checksum())
    }

    private func setComponents(_ newComponents: [Component], enable: Bool) {
        components = newComponents
        componentsEnabled = enable
    }

    private func present(_ component: Component) {
        guard let host = reactInstance.host else {
            return
        }

        let title = component.displayName ?? component.appKey

        let viewController: NSViewController = {
            if let viewController = RTAViewControllerFromString(component.appKey, host) {
                return viewController
            }

            let viewController = NSViewController(nibName: nil, bundle: nil)
            viewController.title = title
            viewController.view = host.view(
                moduleName: component.appKey,
                initialProperties: component.initialProperties
            )
            return viewController
        }()

        switch component.presentationStyle {
        case "modal":
            presentModal(viewController)
        default:
            windowTitle = title
            contentViewController = viewController
        }
    }

    private func presentModal(_ viewController: NSViewController) {
        let rootView = viewController.view
        let modalFrame = NSRect(size: WindowSize.modalSize)
        rootView.frame = modalFrame

        contentDidAppearToken = NotificationCenter.default.addObserver(
            forName: .RCTContentDidAppear,
            object: rootView,
            queue: nil,
            using: { [weak self] _ in
                #if USE_FABRIC
                rootView.frame = modalFrame
                #else
                (rootView as? RCTRootView)?.contentView.frame = modalFrame
                #endif
                if let token = self?.contentDidAppearToken {
                    NotificationCenter.default.removeObserver(token)
                }
            }
        )

        NSApp.keyWindow?.contentViewController?.presentAsModalWindow(viewController)
    }
}

#endif // !ENABLE_SINGLE_APP_MODE

// MARK: - Single-app extensions

#if ENABLE_SINGLE_APP_MODE

extension AppModel {
    func initialize() {}

    func selectComponent(_: Component, at _: Int) {}
}

#endif // ENABLE_SINGLE_APP_MODE

// MARK: - NSRect extensions

extension NSRect {
    init(size: CGSize) {
        self.init(x: 0, y: 0, width: size.width, height: size.height)
    }
}
