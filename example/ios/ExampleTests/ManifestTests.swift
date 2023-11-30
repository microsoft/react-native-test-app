// swiftlint:disable force_cast

import XCTest

// swiftlint:disable identifier_name line_length
let ReactTestApp_AppManifest = "{\"name\":\"Example\",\"displayName\":\"Example\",\"components\":[{\"appKey\":\"Example\",\"displayName\":\"App\"},{\"appKey\":\"Example\",\"displayName\":\"App (modal)\",\"presentationStyle\":\"modal\"}]}"
let ReactTestApp_AppManifestChecksum = "94a9447a98dd58c301b7b178a2ee9f29aac817b4fa3688678e4f39b250d5eb37"
let ReactTestApp_AppManifestLength = 175
// swiftlint:enable identifier_name line_length

class ManifestTests: XCTestCase {
    func testReadFromFile() {
        guard let (manifest, checksum) = Manifest.fromFile() else {
            XCTFail("Failed to read 'app.json'")
            return
        }

        XCTAssertEqual(checksum.count, 64)

        XCTAssertEqual(manifest.name, "Example")
        XCTAssertEqual(manifest.displayName, "Example")

        guard let components = manifest.components else {
            XCTFail("Failed to parse 'components'")
            return
        }

        XCTAssertEqual(components.count, 2)

        let component = components[0]
        XCTAssertEqual(component.appKey, "Example")
        XCTAssertEqual(component.displayName, "App")
        XCTAssertNil(component.presentationStyle)
        XCTAssertNil(component.initialProperties)

        let modalComponent = components[1]
        XCTAssertEqual(modalComponent.appKey, "Example")
        XCTAssertEqual(modalComponent.displayName, "App (modal)")
        XCTAssertEqual(modalComponent.presentationStyle, "modal")
        XCTAssertNil(modalComponent.initialProperties)
    }

    func testMultipleComponents() {
        let expectedComponents = [
            Component(
                appKey: "0",
                displayName: nil,
                initialProperties: ["key": "value"],
                presentationStyle: nil,
                slug: nil
            ),
            Component(
                appKey: "1",
                displayName: "1",
                initialProperties: nil,
                presentationStyle: nil,
                slug: nil
            ),
        ]
        let expected = Manifest(
            name: "Name",
            displayName: "Display Name",
            version: "1.0",
            bundleRoot: nil,
            singleApp: nil,
            components: expectedComponents
        )

        let json = """
            {
                "name": "\(expected.name)",
                "displayName": "\(expected.displayName)",
                "components": [
                    {
                        "appKey": "\(expectedComponents[0].appKey)",
                        "initialProperties": { "key": "value" }
                    },
                    {
                        "appKey": "\(expectedComponents[1].appKey)",
                        "displayName": "\(expectedComponents[1].displayName!)"
                    }
                ]
            }
        """

        guard let data = json.data(using: .utf8),
              let (manifest, checksum) = Manifest.from(data: data)
        else {
            XCTFail("Failed to read manifest")
            return
        }

        XCTAssertEqual(checksum.count, 64)

        XCTAssertEqual(manifest.name, expected.name)
        XCTAssertEqual(manifest.displayName, expected.displayName)

        guard let components = manifest.components else {
            XCTFail("Failed to parse 'components'")
            return
        }

        XCTAssertEqual(components.count, expectedComponents.count)

        XCTAssertEqual(components[0].appKey, expectedComponents[0].appKey)
        XCTAssertEqual(components[0].displayName, expectedComponents[0].displayName)
        XCTAssertEqual(components[0].initialProperties!["key"] as! String,
                       expectedComponents[0].initialProperties!["key"] as! String)

        XCTAssertEqual(components[1].appKey, expectedComponents[1].appKey)
        XCTAssertEqual(components[1].displayName, expectedComponents[1].displayName)
        XCTAssertNil(components[1].initialProperties)
        XCTAssertNil(expectedComponents[1].initialProperties)
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
              let component = manifest.components?.first,
              let initialProperties = component.initialProperties
        else {
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

// swiftlint:enable force_cast
