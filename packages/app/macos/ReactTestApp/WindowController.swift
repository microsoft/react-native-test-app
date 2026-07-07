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
                     keyEquivalentModifierMask: NSEvent.ModifierFlags = [.command],
                     tag: Int? = nil)
    {
        self.init(title: title, action: action, keyEquivalent: keyEquivalent)
        self.target = target
        if !keyEquivalent.isEmpty {
            self.keyEquivalentModifierMask = keyEquivalentModifierMask
        }
        if let tag {
            self.tag = tag
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
            makeFileMenuItem(),
            makeEditMenuItem(),
            makeViewMenuItem(),
            makeReactMenuItem(),
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

    private func makeFileMenuItem() -> NSMenuItem {
        NSMenuItem(submenu: "File", items: [
            NSMenuItem(title: "New", action: #selector(NSDocumentController.newDocument(_:)), keyEquivalent: "n"),
            NSMenuItem(title: "Open…", action: #selector(NSDocumentController.openDocument(_:)), keyEquivalent: "o"),
            NSMenuItem(submenu: "Open Recent", items: [
                NSMenuItem(title: "Clear Menu", action: #selector(NSDocumentController.clearRecentDocuments(_:))),
            ]),
            .separator(),
            NSMenuItem(title: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w"),
            NSMenuItem(title: "Save…", action: #selector(NSDocument.save(_:)), keyEquivalent: "s"),
            NSMenuItem(title: "Save As…", action: #selector(NSDocument.saveAs(_:)), keyEquivalent: "S"),
            NSMenuItem(title: "Revert to Saved", action: #selector(NSDocument.revertToSaved(_:)), keyEquivalent: "r"),
            .separator(),
            NSMenuItem(
                title: "Page Setup…",
                action: #selector(NSDocument.runPageLayout(_:)),
                keyEquivalent: "P",
                keyEquivalentModifierMask: [.shift, .command]
            ),
            NSMenuItem(title: "Print…", action: #selector(NSView.printView(_:)), keyEquivalent: "p"),
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
            NSMenuItem(
                title: "Paste and Match Style",
                action: #selector(NSTextView.pasteAsPlainText(_:)),
                keyEquivalent: "V",
                keyEquivalentModifierMask: [.option, .command]
            ),
            NSMenuItem(title: "Delete", action: #selector(NSText.delete(_:))),
            NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"),
            .separator(),
            NSMenuItem(submenu: "Find", items: [
                NSMenuItem(
                    title: "Find…",
                    action: #selector(NSTextView.performFindPanelAction(_:)),
                    keyEquivalent: "f",
                    tag: 1
                ),
                NSMenuItem(
                    title: "Find and Replace…",
                    action: #selector(NSTextView.performFindPanelAction(_:)),
                    keyEquivalent: "f",
                    keyEquivalentModifierMask: [.option, .command],
                    tag: 12
                ),
                NSMenuItem(
                    title: "Find Next",
                    action: #selector(NSTextView.performFindPanelAction(_:)),
                    keyEquivalent: "g",
                    tag: 2
                ),
                NSMenuItem(
                    title: "Find Previous",
                    action: #selector(NSTextView.performFindPanelAction(_:)),
                    keyEquivalent: "G",
                    tag: 3
                ),
                NSMenuItem(
                    title: "Use Selection for Find",
                    action: #selector(NSTextView.performFindPanelAction(_:)),
                    keyEquivalent: "e",
                    tag: 7
                ),
                NSMenuItem(
                    title: "Jump to Selection",
                    action: #selector(NSTextView.centerSelectionInVisibleArea(_:)),
                    keyEquivalent: "j"
                ),
            ]),
            NSMenuItem(submenu: "Spelling and Grammar", items: [
                NSMenuItem(
                    title: "Show Spelling and Grammar",
                    action: #selector(NSText.showGuessPanel(_:)),
                    keyEquivalent: ":"
                ),
                NSMenuItem(
                    title: "Check Document Now",
                    action: #selector(NSText.checkSpelling(_:)),
                    keyEquivalent: ";"
                ),
                .separator(),
                NSMenuItem(
                    title: "Check Spelling While Typing",
                    action: #selector(NSTextView.toggleContinuousSpellChecking(_:))
                ),
                NSMenuItem(
                    title: "Check Grammar With Spelling",
                    action: #selector(NSTextView.toggleGrammarChecking(_:))
                ),
                NSMenuItem(
                    title: "Correct Spelling Automatically",
                    action: #selector(NSTextView.toggleAutomaticSpellingCorrection(_:))
                ),
            ]),
            NSMenuItem(submenu: "Substitutions", items: [
                NSMenuItem(
                    title: "Show Substitutions",
                    action: #selector(NSTextView.orderFrontSubstitutionsPanel(_:))
                ),
                .separator(),
                NSMenuItem(
                    title: "Smart Copy/Paste",
                    action: #selector(NSTextView.toggleSmartInsertDelete(_:))
                ),
                NSMenuItem(
                    title: "Smart Quotes",
                    action: #selector(NSTextView.toggleAutomaticQuoteSubstitution(_:))
                ),
                NSMenuItem(
                    title: "Smart Dashes",
                    action: #selector(NSTextView.toggleAutomaticDashSubstitution(_:))
                ),
                NSMenuItem(
                    title: "Smart Links",
                    action: #selector(NSTextView.toggleAutomaticLinkDetection(_:))
                ),
                NSMenuItem(
                    title: "Data Detectors",
                    action: #selector(NSTextView.toggleAutomaticDataDetection(_:))
                ),
                NSMenuItem(
                    title: "Text Replacement",
                    action: #selector(NSTextView.toggleAutomaticTextReplacement(_:))
                ),
            ]),
            NSMenuItem(submenu: "Transformations", items: [
                NSMenuItem(title: "Make Upper Case", action: #selector(NSTextView.uppercaseWord(_:))),
                NSMenuItem(title: "Make Lower Case", action: #selector(NSTextView.lowercaseWord(_:))),
                NSMenuItem(title: "Capitalize", action: #selector(NSTextView.capitalizeWord(_:))),
            ]),
            NSMenuItem(submenu: "Speech", items: [
                NSMenuItem(title: "Start Speaking", action: #selector(NSTextView.startSpeaking(_:))),
                NSMenuItem(title: "Stop Speaking", action: #selector(NSTextView.stopSpeaking(_:))),
            ]),
        ])
    }

    private func makeViewMenuItem() -> NSMenuItem {
        NSMenuItem(submenu: "View", items: [
            NSMenuItem(
                title: "Show Toolbar",
                action: #selector(NSWindow.toggleToolbarShown(_:)),
                keyEquivalent: "t",
                keyEquivalentModifierMask: [.option, .command]
            ),
            NSMenuItem(
                title: "Customize Toolbar…",
                action: #selector(NSWindow.runToolbarCustomizationPalette(_:))
            ),
            .separator(),
            NSMenuItem(
                title: "Show Sidebar",
                action: #selector(NSSplitViewController.toggleSidebar(_:)),
                keyEquivalent: "s",
                keyEquivalentModifierMask: [.control, .command]
            ),
            NSMenuItem(
                title: "Enter Full Screen",
                action: #selector(NSWindow.toggleFullScreen(_:)),
                keyEquivalent: "f",
                keyEquivalentModifierMask: [.control, .command]
            ),
        ])
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
