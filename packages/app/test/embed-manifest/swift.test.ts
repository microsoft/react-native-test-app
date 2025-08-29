import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { generate as generateActual } from "../../scripts/embed-manifest/swift.mjs";
import * as fixtures from "./fixtures.ts";

describe("embed manifest (Swift)", () => {
  const generate = (json: Record<string, unknown>) => generateActual(json, "0");

  it("generates all properties", () => {
    equal(
      generate(fixtures.simple),
      `import Foundation

extension Manifest {
    static func checksum() -> String {
        "0"
    }

    static func load() -> Self {
        Manifest(
            name: "Example",
            displayName: "Template",
            version: "1.0",
            bundleRoot: "main",
            singleApp: "single",
            components: [
                Component(
                    appKey: "Example",
                    displayName: "Example",
                    initialProperties: nil,
                    presentationStyle: nil,
                    slug: nil
                ),
                Component(
                    appKey: "Example",
                    displayName: "Template",
                    initialProperties: [:],
                    presentationStyle: "modal",
                    slug: "single"
                ),
            ]
        )
    }
}`
    );
  });

  it("handles missing properties", () => {
    equal(
      generate(fixtures.minimum),
      `import Foundation

extension Manifest {
    static func checksum() -> String {
        "0"
    }

    static func load() -> Self {
        Manifest(
            name: "Example",
            displayName: "Example",
            version: nil,
            bundleRoot: nil,
            singleApp: nil,
            components: []
        )
    }
}`
    );
  });

  it("handles valid JSON data types", () => {
    equal(
      generate(fixtures.extended),
      `import Foundation

extension Manifest {
    static func checksum() -> String {
        "0"
    }

    static func load() -> Self {
        Manifest(
            name: "Example",
            displayName: "Example",
            version: nil,
            bundleRoot: nil,
            singleApp: nil,
            components: [
                Component(
                    appKey: "Example",
                    displayName: "Example",
                    initialProperties: [
                        "boolean": true,
                        "double": 1.1,
                        "int": 1,
                        "null": NSNull(),
                        "string": "string",
                        "array": [
                            true,
                            1.1,
                            1,
                            NSNull(),
                            "string",
                            [
                                true,
                                1.1,
                                1,
                                NSNull(),
                                "string",
                                [],
                                [
                                    "boolean": true,
                                    "double": 1.1,
                                    "int": 1,
                                    "null": NSNull(),
                                    "string": "string",
                                ],
                            ],
                            [
                                "boolean": true,
                                "double": 1.1,
                                "int": 1,
                                "null": NSNull(),
                                "string": "string",
                            ],
                        ],
                        "object": [
                            "boolean": true,
                            "double": 1.1,
                            "int": 1,
                            "null": NSNull(),
                            "string": "string",
                            "array": [
                                true,
                                1.1,
                                1,
                                NSNull(),
                                "string",
                                [
                                    true,
                                    1.1,
                                    1,
                                    NSNull(),
                                    "string",
                                    [],
                                    [
                                        "boolean": true,
                                        "double": 1.1,
                                        "int": 1,
                                        "null": NSNull(),
                                        "string": "string",
                                    ],
                                ],
                                [:],
                            ],
                            "object": [
                                "boolean": true,
                                "double": 1.1,
                                "int": 1,
                                "null": NSNull(),
                                "string": "string",
                                "array": [
                                    true,
                                    1.1,
                                    1,
                                    NSNull(),
                                    "string",
                                    [
                                        true,
                                        1.1,
                                        1,
                                        NSNull(),
                                        "string",
                                        [],
                                        [
                                            "boolean": true,
                                            "double": 1.1,
                                            "int": 1,
                                            "null": NSNull(),
                                            "string": "string",
                                        ],
                                    ],
                                    [
                                        "boolean": true,
                                        "double": 1.1,
                                        "int": 1,
                                        "null": NSNull(),
                                        "string": "string",
                                    ],
                                ],
                            ],
                        ],
                    ],
                    presentationStyle: nil,
                    slug: nil
                ),
            ]
        )
    }
}`
    );
  });
});
