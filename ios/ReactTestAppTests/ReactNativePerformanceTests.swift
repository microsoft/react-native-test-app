//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import XCTest

@testable import ReactTestApp

class ReactNativePerformanceTests: XCTestCase, RCTBridgeDelegate {

    private var wasDebuggingRemotely = false

    override func setUp() {
        // Make sure that remote debugging is disabled otherwise we'll get a RedBox.
        let devSettings = RCTDevSettings()
        if devSettings.isDebuggingRemotely {
            wasDebuggingRemotely = true
            devSettings.isDebuggingRemotely = false
        }
    }

    override func tearDown() {
        // Reset setting for remote debugging.
        if wasDebuggingRemotely {
            RCTDevSettings().isDebuggingRemotely = wasDebuggingRemotely
        }
    }

    func testBridgeInitializationPerformance() {
        var bridge: RCTBridge?
        measure {
            expectation(forNotification: .RCTJavaScriptDidLoad, object: nil, handler: nil)

            DispatchQueue.global(qos: .userInitiated).async {
                bridge = RCTBridge(delegate: self, launchOptions: [:])
            }

            waitForExpectations(timeout: 5, handler: nil)
        }

        guard bridge?.isValid == true else {
            XCTFail("Failed to initialize React Native bridge")
            return
        }
    }

    // MARK: - RCTBridgeDelegate details

    func sourceURL(for bridge: RCTBridge!) -> URL! {
        return Bundle(for: ReactInstance.self).url(
            forResource: "index.mobile",
            withExtension: "jsbundle",
            subdirectory: nil
        )
    }

    func extraModules(for bridge: RCTBridge!) -> [RCTBridgeModule] {
        return []
    }
}
