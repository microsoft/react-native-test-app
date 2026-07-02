import Cocoa
import ReactTestApp_DevSupport

@main
final class AppDelegate: NSObject, NSApplicationDelegate {
    static func main() {
        let delegate = AppDelegate()
        let app = NSApplication.shared
        app.delegate = delegate
        app.run()
    }

    var reactMenu: NSMenu!
    var rememberLastComponentMenuItem: NSMenuItem!

    private(set) lazy var reactInstance = ReactInstance()

    private lazy var windowController = WindowController()
    private lazy var mainWindow = windowController.window

    private var contentDidAppearToken: NSObjectProtocol?

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool {
        true
    }

    /// Builds the main menu and main window programmatically. This replaces
    /// what used to be provided by `Main.storyboard`, and must run before the
    /// rest of `applicationWillFinishLaunching(_:)` since it relies on
    /// `reactMenu`/`rememberLastComponentMenuItem` and `mainWindow` being set.
    private func initWindow() {
        guard windowController.window != nil else {
            fatalError("Failed to create window")
        }

        NSApp.mainMenu = makeMainMenu(title: Manifest.load().displayName)
    }

    func applicationDidFinishLaunching(_: Notification) {
        windowController.showWindow(nil)
        NSApp.activate()

        NotificationCenter.default.post(
            name: .ReactAppDidFinishLaunching,
            object: nil
        )

        initialize()

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

    // MARK: User interaction

    @objc
    func onLoadEmbeddedBundleSelected(_: NSMenuItem) {
        reactInstance.remoteBundleURL = nil
    }

    @objc
    func onLoadFromDevServerSelected(_: NSMenuItem) {
        reactInstance.remoteBundleURL = ReactInstance.jsBundleURL()
    }

    @objc
    func onRememberLastComponentSelected(_ menuItem: NSMenuItem) {
        onRememberLastComponentSelectedInternal(menuItem)
    }

    // MARK: Private

    private enum WindowSize {
        static let defaultSize = CGSize(width: 640, height: 480)
        static let modalSize = CGSize(width: 586, height: 326)
    }

    private func showReactMenu() {
        guard let mainMenu = reactMenu.supermenu else {
            return
        }

        let index = mainMenu.indexOfItem(withSubmenu: reactMenu)
        mainMenu.item(at: index)?.isHidden = false
    }
}

// MARK: - Multi-app extensions

#if !ENABLE_SINGLE_APP_MODE

extension AppDelegate {
    private var isPresenting: Bool {
        !(mainWindow?.contentViewController is ViewController)
    }

    func initialize() {
        let manifest = Manifest.load()
        mainWindow?.title = manifest.displayName

        let components = manifest.components ?? []
        if components.isEmpty {
            NotificationCenter.default.addObserver(
                forName: .ReactAppDidRegisterApps,
                object: nil,
                queue: .main,
                using: { [weak self] note in
                    guard let strongSelf = self,
                          let appKeys = note.userInfo?["appKeys"] as? [String]
                    else {
                        return
                    }

                    let components = appKeys.map { Component(appKey: $0) }
                    strongSelf.onComponentsRegistered(components, enable: true)
                    if components.count == 1, !strongSelf.isPresenting {
                        strongSelf.present(components[0])
                    }
                }
            )
        }

        onComponentsRegistered(components, enable: false)

        let bundleRoot = manifest.bundleRoot
        // As of 0.74, we can no longer instantiate on a background thread:
        // https://github.com/react/react-native/commit/b7025fe1569349d90d26821b2b8de64a8ec9f352
        DispatchQueue.main.async { [weak self] in
            self?.reactInstance.initReact(bundleRoot: bundleRoot) {
                DispatchQueue.main.async { [weak self] in
                    guard let strongSelf = self, !components.isEmpty else {
                        return
                    }

                    if let index = components.count == 1 ? 0 : Session.lastOpenedComponent(Manifest.checksum()) {
                        strongSelf.present(components[index])
                    }

                    strongSelf.reactMenu.items.forEach { $0.isEnabled = true }
                    strongSelf.rememberLastComponentMenuItem.isEnabled = components.count > 1
                }
            }
        }
    }

    func applicationWillFinishLaunching(_: Notification) {
        initWindow()

        // applicationWillFinishLaunching(_:) [ENABLE_SINGLE_APP_MODE=0]

        if Session.shouldRememberLastComponent {
            rememberLastComponentMenuItem.state = .on
        }

        showReactMenu()
    }

    @objc
    private func onComponentSelected(menuItem: NSMenuItem) {
        guard let component = menuItem.representedObject as? Component else {
            return
        }

        present(component)

        Session.storeComponent(index: menuItem.tag, checksum: Manifest.checksum())
    }

    private func onComponentsRegistered(_ components: [Component], enable: Bool) {
        removeAllComponentsFromMenu()
        for (index, component) in components.enumerated() {
            let title = component.displayName ?? component.appKey
            let item = reactMenu.addItem(
                withTitle: title,
                action: #selector(onComponentSelected),
                keyEquivalent: index < 9 ? String(index + 1) : ""
            )
            item.tag = index
            item.keyEquivalentModifierMask = [.shift, .command]
            item.isEnabled = enable
            item.representedObject = component
        }

        rememberLastComponentMenuItem.isEnabled = components.count > 1
    }

    private func onRememberLastComponentSelectedInternal(_ menuItem: NSMenuItem) {
        switch menuItem.state {
        case .mixed, .on:
            Session.shouldRememberLastComponent = false
            menuItem.state = .off
        case .off:
            Session.shouldRememberLastComponent = true
            menuItem.state = .on
        default:
            assertionFailure()
        }
    }

    private func present(_ component: Component) {
        guard let window = mainWindow,
              let host = reactInstance.host
        else {
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

            window.contentViewController?.presentAsModalWindow(viewController)

        default:
            window.title = title
            let frame = window.contentViewController?.view.frame
            viewController.view.frame = frame ?? NSRect(size: WindowSize.defaultSize)
            window.contentViewController = viewController
        }
    }

    private func removeAllComponentsFromMenu() {
        let numberOfItems = reactMenu.numberOfItems
        for reverseIndex in 1 ... numberOfItems {
            let index = numberOfItems - reverseIndex
            guard let item = reactMenu.item(at: index) else {
                preconditionFailure()
            }
            if item.isSeparatorItem == true {
                break
            }
            reactMenu.removeItem(at: index)
        }
    }
}

#endif // !ENABLE_SINGLE_APP_MODE

// MARK: - Single-app extensions

#if ENABLE_SINGLE_APP_MODE

extension AppDelegate {
    func initialize() {}

    func applicationWillFinishLaunching(_: Notification) {
        initWindow()

        guard let window = mainWindow else {
            assertionFailure("Main window should have been instantiated by now")
            return
        }

        guard let (rootView, title) = createReactRootView(reactInstance) else {
            assertionFailure()
            return
        }

        window.title = title

        let frame = window.contentViewController?.view.frame
        rootView.frame = frame ?? NSRect(size: WindowSize.defaultSize)
        window.contentViewController?.view = rootView

        // applicationWillFinishLaunching(_:) [ENABLE_SINGLE_APP_MODE=1]

        #if DEBUG
        showReactMenu()
        #endif // DEBUG
    }

    private func onRememberLastComponentSelectedInternal(_: NSMenuItem) {}
}

#endif // ENABLE_SINGLE_APP_MODE

// MARK: - NSRect extensions

extension NSRect {
    init(size: CGSize) {
        self.init(x: 0, y: 0, width: size.width, height: size.height)
    }
}
