/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Foundation

final class ReactInstance: NSObject, RCTBridgeDelegate, RCTTurboModuleLookupDelegate {
    static func jsBundleURL() -> URL? {
        return RCTBundleURLProvider.sharedSettings().jsBundleURL(
            forBundleRoot: "index",
            fallbackResource: nil
        )
    }

    var remoteBundleURL: URL? {
        didSet {
            initReact(onDidInitialize: { _ in /* noop */ })
        }
    }

    private(set) var bridge: RCTBridge? {
        didSet {
            bridge?.setRCTTurboModuleLookupDelegate(self)
        }
    }

    private var featureLoader: FeatureLoader = FeatureLoader()

    override init() {
        #if DEBUG
        remoteBundleURL = ReactInstance.jsBundleURL()
        #endif

        super.init()

        // Turbo Modules is incompatible with remote JS debugging
        RCTEnableTurboModule(false)

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
            selector: #selector(onRemoteBundleURLReceived(_:)),
            name: .didReceiveRemoteBundleURL,
            object: nil
        )
    }

    init(forTestingPurposesOnly: Bool) {
        assert(forTestingPurposesOnly)
    }

    func initReact(onDidInitialize: @escaping ([RTAFeatureDetails]) -> Void) {
        bridge?.invalidate()
        bridge = RCTBridge(delegate: self, launchOptions: nil)
        if let bridge = bridge {
            featureLoader.loadAll(bridge: bridge, onDidInitialize: onDidInitialize)
        }
    }

    // MARK: - RCTBridgeDelegate details

    func sourceURL(for bridge: RCTBridge?) -> URL? {
        if let remoteBundleURL = remoteBundleURL {
            return remoteBundleURL
        }

        let bundle = Bundle(for: type(of: self))
        return bundle.url(
            forResource: "index.mobile",
            withExtension: "jsbundle",
            subdirectory: nil
        )
    }

    func extraModules(for bridge: RCTBridge!) -> [RCTBridgeModule] {
        return []
    }

    // MARK: - RCTTurboModuleLookupDelegate details

    func module(forName moduleName: UnsafePointer<Int8>?) -> Any? {
        return nil
    }

    func module(forName moduleName: UnsafePointer<Int8>?, warnOnLookupFailure: Bool) -> Any? {
        return nil
    }

    func moduleIsInitialized(_ moduleName: UnsafePointer<Int8>?) -> Bool {
        return false
    }

    // MARK: - Private

    @objc private func onJavaScriptLoading(_ notification: Notification) {
        guard self.bridge != nil else {
            // This is a cold boot. The bridge will be set in initReact(onDidInitialize:).
            return
        }

        let bridge = notification.userInfo?["bridge"] as? RCTBridge
        if bridge != self.bridge {
            self.bridge = bridge
        }
    }

    @objc private func onRemoteBundleURLReceived(_ notification: Notification) {
        guard let value = notification.userInfo?["value"] as? String,
              var urlComponents = URLComponents(string: value) else {
            return
        }

        urlComponents.queryItems = [URLQueryItem(name: "platform", value: "ios")]
        remoteBundleURL = urlComponents.url
    }
}
