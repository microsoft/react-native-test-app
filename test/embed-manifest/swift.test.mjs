// @ts-check
import { equal } from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it } from "node:test";
import { generate as generateActual } from "../../scripts/embed-manifest/swift.mjs";
import * as fixtures from "./fixtures.mjs";

describe("embed manifest (Swift)", () => {
  /** @type {(json: Record<string, unknown>) => Promise<string>} */
  const generate = (json) =>
    new Promise((resolve) => {
      generateActual(json, "0", {
        ...fs,
        existsSync: () => true,
        promises: {
          ...fs.promises,
          mkdir: () => Promise.resolve(undefined),
          writeFile: (_, data) => {
            resolve(data.toString());
            return Promise.resolve();
          },
        },
      });
    });

  it("generates all properties", async () => {
    equal(
      await generate(fixtures.simple),
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
}
`
    );
  });

  it("handles missing properties", async () => {
    equal(
      await generate(fixtures.minimum),
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
}
`
    );
  });

  it("handles valid JSON data types", async () => {
    equal(
      await generate(fixtures.extended),
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
}
`
    );
  });
});
