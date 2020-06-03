//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import Cocoa

@NSApplicationMain
final class AppDelegate: NSObject, NSApplicationDelegate {
    private(set) lazy var reactInstance = ReactInstance()

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        guard let mainMenu = NSApplication.shared.mainMenu else {
            return
        }

        let reactMenu = NSMenu(title: "React")
        reactMenu.autoenablesItems = false
        reactMenu.addItem(
            withTitle: "Load Embedded JS Bundle",
            action: #selector(onLoadEmbeddedBundle),
            keyEquivalent: ""
        )
        reactMenu.addItem(
            withTitle: "Load From Dev Server",
            action: #selector(onLoadFromDevServer),
            keyEquivalent: ""
        )
        reactMenu.addItem(NSMenuItem.separator())

        if let manifest = Manifest.fromFile() {
            for (index, component) in manifest.components.enumerated() {
                let title = component.displayName ?? component.appKey
                let item = reactMenu.addItem(
                    withTitle: title,
                    action: #selector(onComponentSelected),
                    keyEquivalent: index < 10 ? String(index) : ""
                )
                item.keyEquivalentModifierMask = [.shift, .command]
                item.isEnabled = false
                item.representedObject = component
            }
        } else {
            reactMenu.addItem(
                withTitle: "Could not load 'app.json'",
                action: nil,
                keyEquivalent: ""
            )
        }

        // ReactTestApp  File  Edit  Format  View  React  Window  Help
        let reactMenuItem = mainMenu.insertItem(
            withTitle: reactMenu.title,
            action: nil,
            keyEquivalent: "",
            at: 5
        )
        reactMenuItem.submenu = reactMenu

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.reactInstance.initReact { _ in
                DispatchQueue.main.async {
                    reactMenu.items.forEach { $0.isEnabled = true }
                }
            }
        }
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        // Insert code here to tear down your application
    }

    @objc
    private func onComponentSelected(menuItem: NSMenuItem) {
        guard let window = NSApplication.shared.keyWindow,
              let component = menuItem.representedObject as? Component,
              let bridge = reactInstance.bridge else {
            return
        }

        window.title = component.displayName ?? component.appKey

        let viewController: NSViewController = {
            if let viewController = RTAViewControllerFromString(component.appKey, bridge) {
                return viewController
            }

            let viewController = NSViewController(nibName: nil, bundle: nil)
            viewController.view = RCTRootView(
                bridge: bridge,
                moduleName: component.appKey,
                initialProperties: component.initialProperties
            )
            return viewController
        }()

        let frame = window.contentViewController?.view.frame
        viewController.view.frame = frame ?? NSRect(x: 0, y: 0, width: 480, height: 270)

        window.contentViewController = viewController
    }

    @objc
    private func onLoadEmbeddedBundle(menuItem: NSMenuItem) {
        reactInstance.remoteBundleURL = nil
    }

    @objc
    private func onLoadFromDevServer(menuItem: NSMenuItem) {
        reactInstance.remoteBundleURL = ReactInstance.jsBundleURL()
    }
}
