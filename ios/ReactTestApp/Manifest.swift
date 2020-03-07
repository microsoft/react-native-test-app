//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import Foundation

struct Component: Decodable {
    let displayName: String?
    let initialProperties: [String: String]?
}

struct Manifest: Decodable {
    let name: String
    let displayName: String
    let components: [String: Component]

    static func readFile() -> Manifest? {
        guard let manifestURL = Bundle.main.url(forResource: "app", withExtension: "json", subdirectory: "assets"),
              let data = try? Data(contentsOf: manifestURL, options: .uncached) else {
            return nil
        }
        return try? JSONDecoder().decode(self, from: data)
    }
}
