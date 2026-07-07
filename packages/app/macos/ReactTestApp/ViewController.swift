import SwiftUI

struct RootContentView: View {
    @ObservedObject var model: AppModel

    var body: some View {
        content
            .navigationTitle(model.windowTitle)
    }

    @ViewBuilder
    private var content: some View {
        #if ENABLE_SINGLE_APP_MODE
        SingleAppRootView(reactInstance: model.reactInstance)
        #else
        if let viewController = model.contentViewController {
            HostedViewController(viewController: viewController)
                .id(ObjectIdentifier(viewController))
        } else {
            ReactMenuPlaceholderView()
        }
        #endif
    }
}

// MARK: - Multi-app content

#if !ENABLE_SINGLE_APP_MODE

private struct HostedViewController: NSViewControllerRepresentable {
    let viewController: NSViewController

    func makeNSViewController(context: Context) -> NSViewController {
        viewController
    }

    func updateNSViewController(_: NSViewController, context: Context) {}
}

private struct ReactMenuPlaceholderView: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        PlaceholderView(frame: .zero)
    }

    func updateNSView(_: NSView, context: Context) {}
}

private final class PlaceholderView: NSView {
    private let label = Label(
        text: "Click anywhere to get started or open the React menu in the menu bar"
    )

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)

        addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),
            label.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            label.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
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

extension NSMenu {
    static func popUpReactMenu(with event: NSEvent, for view: NSView) {
        // SwiftUI's "React" `CommandMenu` is backed by a real `NSMenu`.
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

// MARK: - Single-app content

#if ENABLE_SINGLE_APP_MODE

private struct SingleAppRootView: NSViewRepresentable {
    let reactInstance: ReactInstance

    func makeNSView(context: Context) -> NSView {
        let container = NSView()
        guard let (rootView, _) = createReactRootView(reactInstance) else {
            return container
        }

        rootView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(rootView)
        NSLayoutConstraint.activate([
            rootView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            rootView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            rootView.topAnchor.constraint(equalTo: container.topAnchor),
            rootView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])
        return container
    }

    func updateNSView(_: NSView, context: Context) {}
}

#endif // ENABLE_SINGLE_APP_MODE
