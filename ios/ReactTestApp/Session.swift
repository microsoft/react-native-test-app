//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import Foundation

struct Session {
    private enum Keys {
        static let checksum = "ManifestChecksum"
        static let rememberLastComponentEnabled = "RememberLastComponent/Enabled"
        static let rememberLastComponentIndex = "RememberLastComponent/Index"
    }

    private static var lastComponentIndex: Int {
        get { UserDefaults.standard.integer(forKey: Keys.rememberLastComponentIndex) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.rememberLastComponentIndex) }
    }

    private static var manifestChecksum: String? {
        get { UserDefaults.standard.string(forKey: Keys.checksum) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.checksum) }
    }

    static var shouldRememberLastComponent: Bool {
        get { UserDefaults.standard.bool(forKey: Keys.rememberLastComponentEnabled) }
        set { UserDefaults.standard.set(newValue, forKey: Keys.rememberLastComponentEnabled) }
    }

    static func lastOpenedComponent(_ checksum: String) -> Int? {
        guard shouldRememberLastComponent, checksum == manifestChecksum else {
            return nil
        }

        return lastComponentIndex
    }

    static func storeComponent(index: Int, checksum: String) {
        lastComponentIndex = index
        manifestChecksum = checksum
    }
}
