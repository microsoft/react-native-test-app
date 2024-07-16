import Foundation
import ReactNativeHost
import ReactTestApp_DevSupport

final class ReactInstance: NSObject, RNXHostConfig {
    public static let scanForQRCodeNotification =
        NSNotification.Name("ReactInstance.scanForQRCodeNotification")

    static func jsBundleURL() -> URL? {
        RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index") { nil }
    }

    var remoteBundleURL: URL? {
        get { remoteBundleURLInternal }
        set {
            remoteBundleURLInternal = newValue
            initReact(bundleRoot: bundleRoot, onDidInitialize: { /* noop */ })
        }
    }

    private(set) var host: ReactNativeHost?
    private var bundleRoot: String?

    // This needs to be lazy because `ReactInstance.jsBundleURL()` will call
    // `InspectorFlags::getFuseboxEnabled()` ->
    // `ReactNativeFeatureFlags::fuseboxEnabledRelease()` before any overrides
    // are set. Setting overrides after this will trigger asserts and crash the
    // app on startup.
    private lazy var remoteBundleURLInternal: URL? = {
        #if DEBUG
        ReactInstance.jsBundleURL()
        #else
        nil
        #endif
    }()

    override init() {
        super.init()

        // Bridged
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onJavaScriptLoaded(_:)),
            name: .RCTJavaScriptDidLoad,
            object: nil
        )

        // Bridgeless
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onJavaScriptLoaded(_:)),
            name: .ReactInstanceDidLoadBundle,
            object: nil
        )

        #if os(iOS)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onRemoteBundleURLReceived(_:)),
            name: .didReceiveRemoteBundleURL,
            object: nil
        )
        #endif
        #if os(macOS)
        NSAppleEventManager.shared().setEventHandler(
            RCTLinkingManager.self,
            andSelector: #selector(RCTLinkingManager.getUrlEventHandler(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
        #endif
    }

    init(forTestingPurposesOnly: Bool) {
        assert(forTestingPurposesOnly)
    }

    func initReact(bundleRoot: String?, onDidInitialize: @escaping () -> Void) {
        if host != nil {
            if remoteBundleURL == nil {
                // When loading the embedded bundle, we must disable remote
                // debugging to prevent the bridge from getting stuck in
                // -[RCTWebSocketExecutor executeApplicationScript:sourceURL:onComplete:]
                RCTDevSettings().isDebuggingRemotely = false
            }
            RCTTriggerReloadCommandListeners("ReactTestApp")
            return
        }

        self.bundleRoot = bundleRoot

        NotificationCenter.default.post(
            name: .ReactTestAppWillInitializeReactNative,
            object: nil
        )

        let reactNativeHost = ReactNativeHost(self)
        host = reactNativeHost

        NotificationCenter.default.post(
            name: .ReactTestAppDidInitializeReactNative,
            object: reactNativeHost
        )

        onDidInitialize()
    }

    // MARK: - RNXHostConfig details

    func onFatalError(_ error: Error) {
        guard let nsError = error as NSError? else {
            print(error.localizedDescription)
            return
        }

        let message = RCTFormatError(
            nsError.localizedDescription,
            nsError.userInfo[RCTJSStackTraceKey] as? [[String: Any]],
            9001
        )
        print(message ?? nsError.localizedDescription)
    }

    // MARK: - RCTBridgeDelegate details

    func sourceURL(for _: RCTBridge) -> URL? {
        remoteBundleURL ?? bundleURL()
    }

    // MARK: - Private

    private func bundleURL() -> URL? {
        let embeddedBundleURL = entryFiles()
            .lazy
            .compactMap {
                Bundle.main.url(
                    forResource: $0,
                    withExtension: "jsbundle"
                )
            }
            .first
        return embeddedBundleURL ?? ReactInstance.jsBundleURL()
    }

    private func entryFiles() -> [String] {
        #if swift(>=5.9)

        #if os(visionOS)
        // Fallback to iOS extensions if visionOS is not present
        let extensions = [".visionos", ".ios", ".mobile", ".native", ""]
        #elseif os(iOS)
        let extensions = [".ios", ".mobile", ".native", ""]
        #elseif os(macOS)
        let extensions = [".macos", ".native", ""]
        #endif // os(visionOS)

        #else // This block *must* be separate for Xcode 14

        #if os(iOS)
        let extensions = [".ios", ".mobile", ".native", ""]
        #elseif os(macOS)
        let extensions = [".macos", ".native", ""]
        #endif // os(iOS)

        #endif // swift(>=5.9)

        guard let bundleRoot else {
            return extensions.reduce(into: []) { files, ext in
                files.append("index" + ext)
                files.append("main" + ext)
            }
        }

        return extensions.map { bundleRoot + $0 }
    }

    @objc
    private func onJavaScriptLoaded(_ notification: Notification) {
        host?.using(module: RCTDevMenu.self) { [weak self] module in
            guard let devMenu = module as? RCTDevMenu else {
                return
            }

            devMenu.add(RCTDevMenuItem.buttonItem(
                titleBlock: {
                    self?.remoteBundleURL == nil
                        ? "Load From Dev Server"
                        : "Load Embedded JS Bundle"
                },
                handler: {
                    guard let strongSelf = self else {
                        return
                    }

                    if strongSelf.remoteBundleURL == nil {
                        strongSelf.remoteBundleURL = ReactInstance.jsBundleURL()
                    } else {
                        strongSelf.remoteBundleURL = strongSelf.bundleURL()
                    }
                }
            ))

            #if os(iOS) && !targetEnvironment(simulator)
            devMenu.add(RCTDevMenuItem.buttonItem(withTitle: "Scan QR Code") {
                NotificationCenter.default.post(
                    name: ReactInstance.scanForQRCodeNotification,
                    object: self
                )
            })
            #endif
        }
    }

    @objc
    private func onRemoteBundleURLReceived(_ notification: Notification) {
        guard var urlComponents = notification.userInfo?["url"] as? URLComponents else {
            return
        }

        urlComponents.queryItems = [URLQueryItem(name: "platform", value: "ios")]
        remoteBundleURL = urlComponents.url
    }
}

#if canImport(UIKit)
typealias RTAView = UIView
#else
typealias RTAView = NSView
#endif

func createReactRootView(_ reactInstance: ReactInstance) -> (RTAView, String)? {
    let manifest = Manifest.load()
    guard let slug = manifest.singleApp else {
        assertionFailure("Missing slug for app component")
        return nil
    }

    guard let component = manifest.components?.first(where: { $0.slug == slug }) else {
        assertionFailure("Failed to find component with slug: \(slug)")
        return nil
    }

    reactInstance.initReact(bundleRoot: manifest.bundleRoot) {}
    guard let host = reactInstance.host else {
        assertionFailure("Failed to initialize ReactNativeHost")
        return nil
    }

    let view = host.view(
        moduleName: component.appKey,
        initialProperties: component.initialProperties
    )
    return (view, component.displayName ?? component.appKey)
}
