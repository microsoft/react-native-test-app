#if os(iOS)
import SwiftUI
import UIKit

// MARK: - App

@main
struct IOSApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            content
                .ignoresSafeArea()
                .onOpenURL { url in
                    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
                }
        }
        .commands {
            #if !ENABLE_SINGLE_APP_MODE || DEBUG
            ReactCommands(model: appDelegate.model)
            #endif
        }
    }

    @ViewBuilder
    private var content: some View {
        #if ENABLE_SINGLE_APP_MODE
        SingleAppRootView(reactInstance: appDelegate.model.reactInstance)
        #else
        MultiAppRootView(appModel: appDelegate.model)
        #endif
    }
}

// MARK: - Multi-app content

#if !ENABLE_SINGLE_APP_MODE

private struct MultiAppRootView: UIViewControllerRepresentable {
    let appModel: AppModel

    func makeUIViewController(context _: Context) -> UIViewController {
        UINavigationController(rootViewController: ContentViewController(appModel: appModel))
    }

    func updateUIViewController(_: UIViewController, context _: Context) {}
}

#endif // !ENABLE_SINGLE_APP_MODE

// MARK: - Single-app content

#if ENABLE_SINGLE_APP_MODE

private struct SingleAppRootView: UIViewControllerRepresentable {
    let reactInstance: ReactInstance

    func makeUIViewController(context _: Context) -> UIViewController {
        let viewController = UIViewController(nibName: nil, bundle: nil)
        if let (rootView, _) = createReactRootView(reactInstance) {
            rootView.backgroundColor = UIColor.systemBackground
            viewController.view = rootView
        }
        return viewController
    }

    func updateUIViewController(_: UIViewController, context _: Context) {}
}

#endif // ENABLE_SINGLE_APP_MODE
#endif // os(iOS)
