//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import XCTest

class ManifestTests: XCTestCase {

    func testReadFromFile() {
        guard let manifest = Manifest.fromFile() else {
            XCTFail("Failed to read 'app.json'")
            return
        }

        XCTAssertEqual(manifest.name, "Example")
        XCTAssertEqual(manifest.displayName, "Example")
        XCTAssertEqual(manifest.components.count, 1)

        let component = manifest.components[0]
        XCTAssertEqual(component.appKey, "Example")
        XCTAssertEqual(component.displayName, "App")
        XCTAssertNil(component.initialProperties)
    }

    func testMultipleComponents() {
        let expected = Manifest(
            name: "Name",
            displayName: "Display Name",
            components: [
                Component(appKey: "0", displayName: nil, initialProperties: ["key": "value"]),
                Component(appKey: "1", displayName: "1", initialProperties: nil),
            ]
        )

        guard let data = try? JSONEncoder().encode(expected),
              let manifest = Manifest.from(data: data) else {
            XCTFail("Failed to read manifest")
            return
        }

        XCTAssertEqual(manifest.name, expected.name)
        XCTAssertEqual(manifest.displayName, expected.displayName)
        XCTAssertEqual(manifest.components.count, expected.components.count)

        XCTAssertEqual(manifest.components[0].appKey,
                       expected.components[0].appKey)
        XCTAssertEqual(manifest.components[0].displayName,
                       expected.components[0].displayName)
        XCTAssertEqual(manifest.components[0].initialProperties!["key"]!,
                       expected.components[0].initialProperties!["key"]!)

        XCTAssertEqual(manifest.components[1].appKey,
                       expected.components[1].appKey)
        XCTAssertEqual(manifest.components[1].displayName,
                       expected.components[1].displayName)
        XCTAssertEqual(manifest.components[1].initialProperties,
                       expected.components[1].initialProperties)
    }

}
