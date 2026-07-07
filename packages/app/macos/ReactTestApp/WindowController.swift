import AppKit

final class WindowController: NSWindowController {
    private static let identifier = "MainWindow"

    init() {
        let viewController = ViewController()
        let window = NSWindow(contentViewController: viewController)
        window.identifier = NSUserInterfaceItemIdentifier(WindowController.identifier)
        window.setFrameAutosaveName(WindowController.identifier)

        super.init(window: window)

        windowFrameAutosaveName = WindowController.identifier
        contentViewController = viewController
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

private extension NSMenu {
    convenience init(title: String, items: [NSMenuItem]) {
        self.init(title: title)
        self.items = items
    }
}

private extension NSMenuItem {
    convenience init(title: String,
                     action: Selector? = nil,
                     target: AnyObject? = nil,
                     keyEquivalent: String = "",
                     keyEquivalentModifierMask: NSEvent.ModifierFlags = [.command])
    {
        self.init(title: title, action: action, keyEquivalent: keyEquivalent)
        self.target = target
        if !keyEquivalent.isEmpty {
            self.keyEquivalentModifierMask = keyEquivalentModifierMask
        }
    }

    convenience init(submenu: String, items: [NSMenuItem]) {
        self.init(title: submenu)
        self.submenu = NSMenu(title: submenu, items: items)
    }

    convenience init(submenu: NSMenu) {
        self.init(title: submenu.title)
        self.submenu = submenu
    }
}

extension AppDelegate {
    func makeMainMenu(title: String) -> NSMenu {
        NSMenu(title: "Main Menu", items: [
            makeAppMenuItem(title: title),
            makeReactMenuItem(),
            makeEditMenuItem(),
            makeViewMenuItem(),
            makeWindowMenuItem(),
            makeHelpMenuItem(title: title),
        ])
    }

    private func makeAppMenuItem(title: String) -> NSMenuItem {
        let servicesMenu = NSMenu(title: "Services")
        NSApp.servicesMenu = servicesMenu

        return NSMenuItem(submenu: title, items: [
            NSMenuItem(title: "About \(title)", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:))),
            .separator(),
            NSMenuItem(title: "Preferences…", keyEquivalent: ","),
            .separator(),
            NSMenuItem(submenu: servicesMenu),
            .separator(),
            NSMenuItem(title: "Hide \(title)", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h"),
            NSMenuItem(
                title: "Hide Others",
                action: #selector(NSApplication.hideOtherApplications(_:)),
                keyEquivalent: "h",
                keyEquivalentModifierMask: [.option, .command]
            ),
            NSMenuItem(title: "Show All", action: #selector(NSApplication.unhideAllApplications(_:))),
            .separator(),
            NSMenuItem(title: "Quit \(title)", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"),
        ])
    }

    private func makeEditMenuItem() -> NSMenuItem {
        NSMenuItem(submenu: "Edit", items: [
            NSMenuItem(title: "Undo", action: Selector(("undo:")), keyEquivalent: "z"),
            NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "Z"),
            .separator(),
            NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x"),
            NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c"),
            NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v"),
            NSMenuItem(title: "Delete", action: #selector(NSText.delete(_:))),
            NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"),
        ])
    }

    private func makeViewMenuItem() -> NSMenuItem {
        NSMenuItem(submenu: "View", items: [])
    }

    private func makeReactMenuItem() -> NSMenuItem {
        let rememberLastComponentMenuItem = NSMenuItem(
            title: "Remember Last Opened Component",
            action: #selector(onRememberLastComponentSelected(_:)),
            target: self
        )
        rememberLastComponentMenuItem.isEnabled = false
        self.rememberLastComponentMenuItem = rememberLastComponentMenuItem

        let reactMenu = NSMenu(title: "React", items: [
            NSMenuItem(
                title: "Load Embedded JS Bundle",
                action: #selector(onLoadEmbeddedBundleSelected(_:)),
                target: self
            ),
            NSMenuItem(
                title: "Load From Dev Server",
                action: #selector(onLoadFromDevServerSelected(_:)),
                target: self
            ),
            rememberLastComponentMenuItem,
            .separator(),
        ])
        reactMenu.autoenablesItems = false
        self.reactMenu = reactMenu

        let reactMenuItem = NSMenuItem(submenu: reactMenu)
        reactMenuItem.isHidden = true
        return reactMenuItem
    }

    private func makeWindowMenuItem() -> NSMenuItem {
        let windowMenu = NSMenu(title: "Window", items: [
            NSMenuItem(title: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m"),
            NSMenuItem(title: "Zoom", action: #selector(NSWindow.performZoom(_:))),
            .separator(),
            NSMenuItem(title: "Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:))),
        ])

        NSApp.windowsMenu = windowMenu

        return NSMenuItem(submenu: windowMenu)
    }

    private func makeHelpMenuItem(title: String) -> NSMenuItem {
        let helpMenu = NSMenu(title: "Help", items: [
            NSMenuItem(title: "\(title) Help", action: #selector(NSApplication.showHelp(_:)), keyEquivalent: "?"),
        ])

        NSApp.helpMenu = helpMenu

        return NSMenuItem(submenu: helpMenu)
    }
}
