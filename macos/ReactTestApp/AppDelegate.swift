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

    private(set) lazy var reactInstance = ReactInstance()

    private weak var mainWindow: NSWindow?

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool {
        true
    }

    func applicationDidFinishLaunching(_: Notification) {
        // `keyWindow` might be `nil` while loading or when the window is not
        // active. Use `identifier` to find our main window.
        let windows = NSApplication.shared.windows
        mainWindow = windows.first { $0.identifier?.rawValue == "MainWindow" }

        guard let manifest = Manifest.fromFile() else {
            let item = reactMenu.addItem(
                withTitle: "Could not load 'app.json'",
                action: nil,
                keyEquivalent: ""
            )
            item.isEnabled = false
            return
        }

        for (index, component) in manifest.components.enumerated() {
            let title = component.displayName ?? component.appKey
            let item = reactMenu.addItem(
                withTitle: title,
                action: #selector(onComponentSelected),
                keyEquivalent: index < 9 ? String(index + 1) : ""
            )
            item.keyEquivalentModifierMask = [.shift, .command]
            item.isEnabled = false
            item.representedObject = component
        }

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.reactInstance.initReact { _ in
                DispatchQueue.main.async {
                    if manifest.components.count == 1 {
                        self?.present(manifest.components[0])
                    }
                    self?.reactMenu.items.forEach { $0.isEnabled = true }
                }
            }
        }
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
    }

    @IBAction
    func onLoadEmbeddedBundle(_: NSMenuItem) {
        reactInstance.remoteBundleURL = nil
    }

    @IBAction
    func onLoadFromDevServer(_: NSMenuItem) {
        reactInstance.remoteBundleURL = ReactInstance.jsBundleURL()
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
            viewController.view.frame = NSRect(size: WindowSize.modalSize)
            if let rootView = viewController.view as? RCTRootView {
                rootView.minimumSize = WindowSize.modalSize
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
