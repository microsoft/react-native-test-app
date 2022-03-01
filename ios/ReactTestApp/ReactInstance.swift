import Foundation

final class ReactInstance: NSObject, RCTBridgeDelegate {
    public static let scanForQRCodeNotification =
        NSNotification.Name("ReactInstance.scanForQRCodeNotification")

    static func jsBundleURL() -> URL? {
        RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index") { nil }
    }

    var remoteBundleURL: URL? {
        didSet {
            initReact(bundleRoot: bundleRoot, onDidInitialize: { /* noop */ })
        }
    }

    private var surfacePresenterBridgeAdapter: NSObject?
    private(set) var bridge: RCTBridge?
    private var bundleRoot: String?

    #if USE_TURBOMODULE
        private lazy var turboModuleManagerDelegate = RTATurboModuleManagerDelegate(bridgeDelegate: self)
    #endif

    override init() {
        #if DEBUG
            remoteBundleURL = ReactInstance.jsBundleURL()
        #endif

        super.init()

        #if USE_TURBOMODULE
            RCTEnableTurboModule(true)
        #endif

        RCTSetFatalHandler { (error: Error?) in
            guard let error = error else {
                print("Unknown error")
                return
            }

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

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onJavaScriptLoading(_:)),
            name: .RCTJavaScriptWillStartLoading,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onJavaScriptLoaded(_:)),
            name: .RCTJavaScriptDidLoad,
            object: nil
        )

        #if os(iOS)
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(onRemoteBundleURLReceived(_:)),
                name: .didReceiveRemoteBundleURL,
                object: nil
            )
        #else
            NSAppleEventManager.shared().setEventHandler(
                RCTLinkingManager.self,
                andSelector: #selector(RCTLinkingManager.getUrlEventHandler(_:withReplyEvent:)),
                forEventClass: AEEventClass(kInternetEventClass),
                andEventID: AEEventID(kAEGetURL)
            )
        #endif

        #if USE_FLIPPER
            if let flipper = FlipperClient.shared() {
                flipper.add(FlipperKitLayoutPlugin(
                    rootNode: UIApplication.shared,
                    with: SKDescriptorMapper(defaults: ())
                ))
                flipper.add(FKUserDefaultsPlugin(suiteName: nil))
                flipper.add(FlipperKitReactPlugin())
                flipper.add(FlipperKitNetworkPlugin(networkAdapter: SKIOSNetworkAdapter()))
                flipper.start()
            }
        #endif
    }

    init(forTestingPurposesOnly: Bool) {
        assert(forTestingPurposesOnly)
    }

    func initReact(bundleRoot: String?, onDidInitialize: @escaping () -> Void) {
        if bridge != nil {
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

        #if USE_TURBOMODULE
            guard let bridge = RCTBridge(delegate: turboModuleManagerDelegate, launchOptions: nil) else {
                assertionFailure("Failed to instantiate RCTBridge with TurboModule")
                return
            }
        #else
            guard let bridge = RCTBridge(delegate: self, launchOptions: nil) else {
                assertionFailure("Failed to instantiate RCTBridge")
                return
            }
        #endif // USE_TURBOMODULE

        surfacePresenterBridgeAdapter = RTACreateSurfacePresenterBridgeAdapter(bridge)
        self.bridge = bridge

        NotificationCenter.default.post(
            name: .ReactTestAppDidInitializeReactNative,
            object: bridge
        )

        onDidInitialize()
    }

    // MARK: - RCTBridgeDelegate details

    func sourceURL(for _: RCTBridge?) -> URL? {
        if let remoteBundleURL = remoteBundleURL {
            return remoteBundleURL
        }

        let embeddedBundleURL = entryFiles()
            .lazy
            .map {
                Bundle.main.url(
                    forResource: $0,
                    withExtension: "jsbundle"
                )
            }
            .first(where: { $0 != nil })
        return embeddedBundleURL ?? ReactInstance.jsBundleURL()
    }

    func extraModules(for _: RCTBridge!) -> [RCTBridgeModule] {
        []
    }

    // MARK: - Private

    private func entryFiles() -> [String] {
        #if os(iOS)
            let extensions = [".ios", ".mobile", ".native", ""]
        #elseif os(macOS)
            let extensions = [".macos", ".native", ""]
        #endif

        guard let bundleRoot = bundleRoot else {
            return extensions.reduce(into: []) { files, ext in
                files.append("index" + ext)
                files.append("main" + ext)
            }
        }

        return extensions.map { bundleRoot + $0 }
    }

    @objc
    private func onJavaScriptLoaded(_ notification: Notification) {
        guard let bridge = notification.userInfo?["bridge"] as? RCTBridge,
              let currentBundleURL = bridge.bundleURL
        else {
            return
        }

        RCTExecuteOnMainQueue { [weak self] in
            guard let devMenu = bridge.devMenu else {
                return
            }

            devMenu.add(RCTDevMenuItem.buttonItem(
                titleBlock: {
                    currentBundleURL.isFileURL
                        ? "Load From Dev Server"
                        : "Load Embedded JS Bundle"
                },
                handler: {
                    guard let strongSelf = self else {
                        return
                    }

                    if currentBundleURL.isFileURL {
                        strongSelf.remoteBundleURL = ReactInstance.jsBundleURL()
                    } else {
                        strongSelf.remoteBundleURL = nil
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
    private func onJavaScriptLoading(_ notification: Notification) {
        guard self.bridge != nil else {
            // This is a cold boot. The bridge will be set in initReact(onDidInitialize:).
            return
        }

        let bridge = notification.userInfo?["bridge"] as? RCTBridge
        if bridge != self.bridge {
            self.bridge = bridge
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

#if os(iOS)
    typealias RTAView = UIView
#else
    typealias RTAView = NSView
#endif

func createReactRootView(_ reactInstance: ReactInstance) -> (RTAView, String)? {
    guard let (manifest, _) = Manifest.fromFile(),
          let slug = manifest.singleApp
    else {
        assertionFailure("Failed to load manifest")
        return nil
    }

    guard let component = manifest.components?.first(where: { $0.slug == slug }) else {
        assertionFailure("Failed to find component with slug: \(slug)")
        return nil
    }

    reactInstance.initReact(bundleRoot: manifest.bundleRoot) {}
    guard let bridge = reactInstance.bridge else {
        assertionFailure("Failed to initialize React")
        return nil
    }

    let view = RTACreateReactRootView(
        bridge,
        component.appKey,
        component.initialProperties
    )
    return (view, component.displayName ?? component.appKey)
}
