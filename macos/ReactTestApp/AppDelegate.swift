//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import Cocoa

@NSApplicationMain
final class AppDelegate: NSObject, NSApplicationDelegate {
    @IBOutlet var reactMenu: NSMenu!
    @IBOutlet var rememberLastComponentMenuItem: NSMenuItem!

    private(set) lazy var reactInstance = ReactInstance()

    private weak var mainWindow: NSWindow?
    private var manifestChecksum: String?

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool {
        true
    }

    func applicationDidFinishLaunching(_: Notification) {
        // `keyWindow` might be `nil` while loading or when the window is not
        // active. Use `identifier` to find our main window.
        let windows = NSApplication.shared.windows
        mainWindow = windows.first { $0.identifier?.rawValue == "MainWindow" }

        if Session.shouldRememberLastComponent {
            rememberLastComponentMenuItem.state = .on
        }

        guard let (manifest, checksum) = Manifest.fromFile() else {
            let item = reactMenu.addItem(
                withTitle: "Could not load 'app.json'",
                action: nil,
                keyEquivalent: ""
            )
            item.isEnabled = false
            return
        }

        manifest.components.enumerated().forEach { index, component in
            let title = component.displayName ?? component.appKey
            let item = reactMenu.addItem(
                withTitle: title,
                action: #selector(onComponentSelected),
                keyEquivalent: index < 9 ? String(index + 1) : ""
            )
            item.tag = index
            item.keyEquivalentModifierMask = [.shift, .command]
            item.isEnabled = false
            item.representedObject = component
        }

        let components = manifest.components
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.reactInstance.initReact {
                DispatchQueue.main.async {
                    guard let strongSelf = self else {
                        return
                    }

                    if let index = components.count == 1 ? 0 : Session.lastOpenedComponent(checksum) {
                        strongSelf.present(components[index])
                    }

                    strongSelf.reactMenu.items.forEach { $0.isEnabled = true }
                }
            }
        }

        manifestChecksum = checksum
    }

    func applicationWillTerminate(_: Notification) {
        // Insert code here to tear down your application
    }

    // MARK: - User interaction

    @objc
    private func onComponentSelected(menuItem: NSMenuItem) {
        guard let component = menuItem.representedObject as? Component else {
            return
        }

        present(component)

        if let checksum = manifestChecksum {
            Session.storeComponent(index: menuItem.tag, checksum: checksum)
        }
    }

    @IBAction
    func onLoadEmbeddedBundleSelected(_: NSMenuItem) {
        reactInstance.remoteBundleURL = nil
    }

    @IBAction
    func onLoadFromDevServerSelected(_: NSMenuItem) {
        reactInstance.remoteBundleURL = ReactInstance.jsBundleURL()
    }

    @IBAction
    func onRememberLastComponentSelected(_ menuItem: NSMenuItem) {
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

    // MARK: - Private

    private enum WindowSize {
        static let defaultSize = CGSize(width: 640, height: 480)
        static let modalSize = CGSize(width: 586, height: 326)
    }

    private func present(_ component: Component) {
        guard let window = mainWindow,
              let bridge = reactInstance.bridge
        else {
            return
        }

        let title = component.displayName ?? component.appKey

        let viewController: NSViewController = {
            if let viewController = RTAViewControllerFromString(component.appKey, bridge) {
                return viewController
            }

            let viewController = NSViewController(nibName: nil, bundle: nil)
            viewController.title = title
            viewController.view = RCTRootView(
                bridge: bridge,
                moduleName: component.appKey,
                initialProperties: component.initialProperties
            )
            return viewController
        }()

        switch component.presentationStyle {
        case "modal":
            let modalFrame = NSRect(size: WindowSize.modalSize)
            viewController.view.frame = modalFrame
            if let rootView = viewController.view as? RCTRootView {
                var token: NSObjectProtocol?
                token = NotificationCenter.default.addObserver(
                    forName: .RCTContentDidAppear,
                    object: rootView,
                    queue: nil,
                    using: { _ in
                        rootView.contentView.frame = modalFrame
                        NotificationCenter.default.removeObserver(token!)
                    }
                )
            }
            window.contentViewController?.presentAsModalWindow(viewController)
        default:
            window.title = title
            let frame = window.contentViewController?.view.frame
            viewController.view.frame = frame ?? NSRect(size: WindowSize.defaultSize)
            window.contentViewController = viewController
        }
    }
}

extension NSRect {
    init(size: CGSize) {
        self.init(x: 0, y: 0, width: size.width, height: size.height)
    }
}
