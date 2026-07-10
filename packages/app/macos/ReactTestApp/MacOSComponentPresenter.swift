import Cocoa

#if !ENABLE_SINGLE_APP_MODE

/// Owns the macOS window's presented content. This is the AppKit-specific half
/// of the component flow: it builds the view controller for a component and
/// handles default versus modal presentation, keeping `AppModel` free of
/// AppKit view-controller construction.
final class MacOSComponentPresenter: ObservableObject {
    @Published var windowTitle: String
    @Published private(set) var contentViewController: NSViewController?

    weak var reactInstance: ReactInstance?

    private var contentDidAppearToken: NSObjectProtocol?

    private enum WindowSize {
        static let modalSize = CGSize(width: 586, height: 326)
    }

    init(windowTitle: String) {
        self.windowTitle = windowTitle
    }

    var isPresenting: Bool {
        contentViewController != nil
    }

    func present(_ component: Component) {
        guard let host = reactInstance?.host else {
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
