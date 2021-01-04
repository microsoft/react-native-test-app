//
// Copyright (c) Microsoft Corporation. All rights reserved.
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// swiftlint:disable force_cast

import XCTest

class ManifestTests: XCTestCase {

    func testReadFromFile() {
        guard let (manifest, checksum) = Manifest.fromFile() else {
            XCTFail("Failed to read 'app.json'")
            return
        }

        XCTAssertEqual(checksum.count, 64)

        XCTAssertEqual(manifest.name, "Example")
        XCTAssertEqual(manifest.displayName, "Example")
        XCTAssertEqual(manifest.components.count, 2)

        let component = manifest.components[0]
        XCTAssertEqual(component.appKey, "Example")
        XCTAssertEqual(component.displayName, "App")
        XCTAssertNil(component.presentationStyle)
        XCTAssertNil(component.initialProperties)

        let modalComponent = manifest.components[1]
        XCTAssertEqual(modalComponent.appKey, "Example")
        XCTAssertEqual(modalComponent.displayName, "App (modal)")
        XCTAssertEqual(modalComponent.presentationStyle, "modal")
        XCTAssertNil(modalComponent.initialProperties)
    }

    func testMultipleComponents() {
        let expected = Manifest(
            name: "Name",
            displayName: "Display Name",
            components: [
                Component(
                    appKey: "0",
                    displayName: nil,
                    initialProperties: ["key": "value"],
                    presentationStyle: nil
                ),
                Component(
                    appKey: "1",
                    displayName: "1",
                    initialProperties: nil,
                    presentationStyle: nil
                ),
            ]
        )

        let json = """
            {
                "name": "\(expected.name)",
                "displayName": "\(expected.displayName)",
                "components": [
                    {
                        "appKey": "\(expected.components[0].appKey)",
                        "initialProperties": { "key": "value" }
                    },
                    {
                        "appKey": "\(expected.components[1].appKey)",
                        "displayName": "\(expected.components[1].displayName!)"
                    }
                ]
            }
        """

        guard let data = json.data(using: .utf8),
              let (manifest, checksum) = Manifest.from(data: data) else {
            XCTFail("Failed to read manifest")
            return
        }

        XCTAssertEqual(checksum.count, 64)

        XCTAssertEqual(manifest.name, expected.name)
        XCTAssertEqual(manifest.displayName, expected.displayName)
        XCTAssertEqual(manifest.components.count, expected.components.count)

        XCTAssertEqual(manifest.components[0].appKey,
                       expected.components[0].appKey)
        XCTAssertEqual(manifest.components[0].displayName,
                       expected.components[0].displayName)
        XCTAssertEqual(manifest.components[0].initialProperties!["key"] as! String,
                       expected.components[0].initialProperties!["key"] as! String)

        XCTAssertEqual(manifest.components[1].appKey,
                       expected.components[1].appKey)
        XCTAssertEqual(manifest.components[1].displayName,
                       expected.components[1].displayName)
        XCTAssertNil(manifest.components[1].initialProperties)
        XCTAssertNil(expected.components[1].initialProperties)
    }

    func testComplexInitialProperties() {
        let json = """
            {
                "name": "Name",
                "displayName": "Display Name",
                "components": [
                    {
                        "appKey": "AppKey",
                        "initialProperties": {
                            "boolean": true,
                            "number": 9000,
                            "string": "string",
                            "array": [
                                null,
                                true,
                                9000,
                                "string",
                                [],
                                {}
                            ],
                            "object": {
                                "boolean": true,
                                "number": 9000,
                                "string": "string",
                                "array": [
                                    null,
                                    true,
                                    9000,
                                    "string",
                                    [],
                                    {}
                                ],
                                "object": null
                            }
                        }
                    }
                ]
            }
        """

        guard let data = json.data(using: .utf8),
              let (manifest, _) = Manifest.from(data: data),
              let component = manifest.components.first,
              let initialProperties = component.initialProperties else {
            XCTFail("Failed to read manifest")
            return
        }

        XCTAssertTrue(initialProperties["boolean"] as! Bool)
        XCTAssertEqual(initialProperties["number"] as! Double, 9000)
        XCTAssertEqual(initialProperties["string"] as! String, "string")

        let array = initialProperties["array"] as! [Any]
        XCTAssertNotNil(array[0] as? NSNull)
        XCTAssertTrue(array[1] as! Bool)
        XCTAssertEqual(array[2] as! Double, 9000)
        XCTAssertEqual(array[3] as! String, "string")
        XCTAssertNotNil(array[4] as? [Any])
        XCTAssertNotNil(array[5] as? [AnyHashable: Any])

        let object = initialProperties["object"] as! [AnyHashable: Any]
        XCTAssertTrue(object["boolean"] as! Bool)
        XCTAssertEqual(object["number"] as! Double, 9000)
        XCTAssertEqual(object["string"] as! String, "string")

        let innerArray = object["array"] as! [Any]
        XCTAssertNotNil(innerArray[0] as? NSNull)
        XCTAssertTrue(innerArray[1] as! Bool)
        XCTAssertEqual(innerArray[2] as! Double, 9000)
        XCTAssertEqual(innerArray[3] as! String, "string")
        XCTAssertNotNil(innerArray[4] as? [Any])
        XCTAssertNotNil(innerArray[5] as? [AnyHashable: Any])

        XCTAssertNotNil(object["object"] as? NSNull)
    }
}
