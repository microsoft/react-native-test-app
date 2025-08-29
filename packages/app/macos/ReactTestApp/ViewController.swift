import AppKit

final class ViewController: NSViewController {
    override var representedObject: Any? {
        didSet {
            // Update the view, if already loaded.
        }
    }

    #if !ENABLE_SINGLE_APP_MODE

    override func viewDidLoad() {
        super.viewDidLoad()

        let label = Label(text: "Click anywhere to get started or open the React menu in the menu bar")
        view.addSubview(label)

        NSLayoutConstraint.activate(
            NSLayoutConstraint.constraints(
                withVisualFormat: "V:|-[label]-|",
                options: [],
                metrics: nil,
                views: ["label": label]
            )
        )
        NSLayoutConstraint.activate(
            NSLayoutConstraint.constraints(
                withVisualFormat: "H:|-[label]-|",
                options: [],
                metrics: nil,
                views: ["label": label]
            )
        )
    }

    override func mouseDown(with event: NSEvent) {
        NSMenu.popUpReactMenu(with: event, for: view)
    }

    override func rightMouseDown(with event: NSEvent) {
        NSMenu.popUpReactMenu(with: event, for: view)
    }

    #endif // !ENABLE_SINGLE_APP_MODE
}

#if !ENABLE_SINGLE_APP_MODE

extension NSMenu {
    static func popUpReactMenu(with event: NSEvent, for view: NSView) {
        guard let reactMenu = NSApplication.shared.mainMenu?.item(withTitle: "React")?.submenu else {
            return
        }

        popUpContextMenu(reactMenu, with: event, for: view)
    }
}

final class Label: NSTextView {
    init(text: String) {
        super.init(frame: .zero)

        translatesAutoresizingMaskIntoConstraints = false
        string = text
        isEditable = false
        isSelectable = false
        isRichText = false
        drawsBackground = false
        font = NSFont.messageFont(ofSize: NSFont.systemFontSize)
        alignment = .center
    }

    override init(frame frameRect: NSRect, textContainer container: NSTextContainer?) {
        super.init(frame: frameRect, textContainer: container)
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func mouseDown(with event: NSEvent) {
        NSMenu.popUpReactMenu(with: event, for: self)
    }

    override func rightMouseDown(with event: NSEvent) {
        NSMenu.popUpReactMenu(with: event, for: self)
    }
}

#endif // !ENABLE_SINGLE_APP_MODE
