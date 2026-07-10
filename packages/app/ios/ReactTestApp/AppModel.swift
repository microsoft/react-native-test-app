import Combine
import Foundation

/// Cross-platform application model. It owns the React runtime, the component
/// catalog, and the manifest-driven initialization and selection decisions, and
/// delegates the actual on-screen presentation to a platform `ComponentPresenting`.
/// It contains no UIKit/AppKit view or view-controller construction.
final class AppModel: ObservableObject {
    let reactInstance: ReactInstance
    let picker = ComponentPickerModel(checksum: Manifest.checksum())

    #if !ENABLE_SINGLE_APP_MODE
    weak var presenter: ComponentPresenting?

    private var registerAppsToken: NSObjectProtocol?
    #endif

    init(reactInstance: ReactInstance) {
        self.reactInstance = reactInstance
    }

    func loadEmbeddedBundle() {
        reactInstance.remoteBundleURL = nil
    }

    func loadFromDevServer() {
        reactInstance.remoteBundleURL = ReactInstance.jsBundleURL()
    }
}

// MARK: - Multi-app extensions

#if !ENABLE_SINGLE_APP_MODE

extension AppModel {
    func initialize() {
        let manifest = Manifest.load()

        let appComponents = manifest.components ?? []
        if appComponents.isEmpty {
            registerAppsToken = NotificationCenter.default.addObserver(
                forName: .ReactAppDidRegisterApps,
                object: nil,
                queue: .main,
                using: { [weak self] note in
                    guard let strongSelf = self,
                          let appKeys = note.userInfo?["appKeys"] as? [String]
                    else {
                        return
                    }

                    let registered = appKeys.map { Component(appKey: $0) }
                    strongSelf.picker.replaceComponents(registered, enabled: true)
                    if registered.count == 1,
                       strongSelf.presenter?.shouldAutoPresentRegisteredComponent == true
                    {
                        strongSelf.presenter?.present(registered[0])
                    }
                }
            )
        }

        picker.replaceComponents(appComponents, enabled: false)

        let bundleRoot = manifest.bundleRoot
        // As of 0.74, we can no longer instantiate on a background thread:
        // https://github.com/facebook/react-native/commit/b7025fe1569349d90d26821b2b8de64a8ec9f352
        DispatchQueue.main.async { [weak self] in
            self?.reactInstance.initReact(bundleRoot: bundleRoot) {
                DispatchQueue.main.async { [weak self] in
                    guard let strongSelf = self, !appComponents.isEmpty else {
                        return
                    }

                    if let index = appComponents.count == 1 ? 0 : strongSelf.picker.rememberedComponentIndex() {
                        strongSelf.presenter?.present(appComponents[index])
                    }

                    strongSelf.picker.setComponentsEnabled(true)
                }
            }
        }
    }

    func selectComponent(_ component: Component, at index: Int) {
        presenter?.present(component)
        picker.recordSelection(at: index)
    }
}

#endif // !ENABLE_SINGLE_APP_MODE

// MARK: - Single-app extensions

#if ENABLE_SINGLE_APP_MODE

extension AppModel {
    func initialize() {}

    func selectComponent(_: Component, at _: Int) {}
}

#endif // ENABLE_SINGLE_APP_MODE
