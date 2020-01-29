/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Foundation

private func isFeatureDetails(_ cls: AnyClass) -> Bool {
    return class_conformsToProtocol(cls, RTAFeatureDetails.self)
}

struct FeatureLoader {
    private(set) var features = [RTAFeatureDetails]()
    private var isLoaded = false

    mutating func loadAll(bridge: RCTBridge, onDidInitialize: @escaping ([RTAFeatureDetails]) -> Void) {
        guard !isLoaded else {
            onDidInitialize(features)
            return
        }

        isLoaded = true

        var count = UInt32(0)
        guard let classList = objc_copyClassList(&count) else {
            assertionFailure()
            return
        }

        defer {
            free(UnsafeMutableRawPointer(classList))
        }

        let selfName = String(describing: type(of: self))
        for index in 0..<Int(count) {
            let cls: AnyClass = classList[index]
            guard isFeatureDetails(cls), let feature = cls as? RTAFeatureDetails.Type else {
                continue
            }

            let details = feature.init(bridge: bridge)
            NSLog("\(selfName): Found '\(details.name)'")
            features.append(details)
        }

        onDidInitialize(features)
    }
}
