// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { generate as generateActual } from "../../scripts/embed-manifest/kotlin.mjs";

describe("embed manifest (Kotlin)", () => {
  /** @type {(json: Record<string, unknown>) => string} */
  const generate = (json) => generateActual(json, "0");

  it("generates all properties", () => {
    const code = generate({
      $schema:
        "https://raw.githubusercontent.com/microsoft/react-native-test-app/trunk/schema.json",
      name: "Example",
      displayName: "Template",
      version: "1.0",
      bundleRoot: "main",
      singleApp: "single",
      components: [
        {
          appKey: "Example",
          displayName: "Template",
          initialProperties: {},
          presentationStyle: "modal",
          slug: "single",
        },
      ],
      resources: ["dist/res", "dist/main.jsbundle"],
    });
    equal(
      code,
      `package com.microsoft.reacttestapp.manifest

import android.os.Bundle

class ManifestProvider {
    companion object {
        fun checksum(): String {
            return "0"
        }

        fun manifest(): Manifest {
            return Manifest(
                "Example",
                "Template",
                "1.0",
                "main",
                "single",
                arrayListOf(
                    Component(
                        "Example",
                        "Template",
                        Bundle(),
                        "modal",
                        "single"
                    ),
                )
            )
        }
    }
}
`
    );
  });

  it("handles missing properties", () => {
    const code = generate({ name: "Example" });
    equal(
      code,
      `package com.microsoft.reacttestapp.manifest

import android.os.Bundle

class ManifestProvider {
    companion object {
        fun checksum(): String {
            return "0"
        }

        fun manifest(): Manifest {
            return Manifest(
                "Example",
                "Example",
                null,
                null,
                null,
                arrayListOf()
            )
        }
    }
}
`
    );
  });

  it("handles valid JSON data types", () => {
    const code = generate({
      name: "Example",
      components: [
        {
          appKey: "Example",
          initialProperties: {
            boolean: true,
            double: 1.1,
            int: 1,
            null: null,
            string: "string",
            array: [
              true,
              1.1,
              1,
              null,
              "string",
              [
                true,
                1.1,
                1,
                null,
                "string",
                [],
                {
                  boolean: true,
                  double: 1.1,
                  int: 1,
                  null: null,
                  string: "string",
                },
              ],
              {
                boolean: true,
                double: 1.1,
                int: 1,
                null: null,
                string: "string",
              },
            ],
            object: {
              boolean: true,
              double: 1.1,
              int: 1,
              null: null,
              string: "string",
              array: [
                true,
                1.1,
                1,
                null,
                "string",
                [
                  true,
                  1.1,
                  1,
                  null,
                  "string",
                  [],
                  {
                    boolean: true,
                    double: 1.1,
                    int: 1,
                    null: null,
                    string: "string",
                  },
                ],
                {
                  boolean: true,
                  double: 1.1,
                  int: 1,
                  null: null,
                  string: "string",
                },
              ],
              object: {
                boolean: true,
                double: 1.1,
                int: 1,
                null: null,
                string: "string",
                array: [
                  true,
                  1.1,
                  1,
                  null,
                  "string",
                  [
                    true,
                    1.1,
                    1,
                    null,
                    "string",
                    [],
                    {
                      boolean: true,
                      double: 1.1,
                      int: 1,
                      null: null,
                      string: "string",
                    },
                  ],
                  {
                    boolean: true,
                    double: 1.1,
                    int: 1,
                    null: null,
                    string: "string",
                  },
                ],
              },
            },
          },
        },
      ],
      resources: ["dist/res", "dist/main.jsbundle"],
    });
    equal(
      code,
      `package com.microsoft.reacttestapp.manifest

import android.os.Bundle

class ManifestProvider {
    companion object {
        fun checksum(): String {
            return "0"
        }

        fun manifest(): Manifest {
            return Manifest(
                "Example",
                "Example",
                null,
                null,
                null,
                arrayListOf(
                    Component(
                        "Example",
                        "Example",
                        Bundle().apply {
                            putBoolean("boolean", true)
                            putDouble("double", 1.1)
                            putInt("int", 1)
                            putString("null", null)
                            putString("string", "string")
                            putSerializable(
                                "array",
                                arrayListOf(
                                    true,
                                    1.1,
                                    1,
                                    null,
                                    "string",
                                    arrayListOf(
                                        true,
                                        1.1,
                                        1,
                                        null,
                                        "string",
                                        arrayListOf(),
                                        Bundle().apply {
                                            putBoolean("boolean", true)
                                            putDouble("double", 1.1)
                                            putInt("int", 1)
                                            putString("null", null)
                                            putString("string", "string")
                                        }
                                    ),
                                    Bundle().apply {
                                        putBoolean("boolean", true)
                                        putDouble("double", 1.1)
                                        putInt("int", 1)
                                        putString("null", null)
                                        putString("string", "string")
                                    }
                                )
                            )
                            putMap(
                                "object",
                                Bundle().apply {
                                    putBoolean("boolean", true)
                                    putDouble("double", 1.1)
                                    putInt("int", 1)
                                    putString("null", null)
                                    putString("string", "string")
                                    putSerializable(
                                        "array",
                                        arrayListOf(
                                            true,
                                            1.1,
                                            1,
                                            null,
                                            "string",
                                            arrayListOf(
                                                true,
                                                1.1,
                                                1,
                                                null,
                                                "string",
                                                arrayListOf(),
                                                Bundle().apply {
                                                    putBoolean("boolean", true)
                                                    putDouble("double", 1.1)
                                                    putInt("int", 1)
                                                    putString("null", null)
                                                    putString("string", "string")
                                                }
                                            ),
                                            Bundle().apply {
                                                putBoolean("boolean", true)
                                                putDouble("double", 1.1)
                                                putInt("int", 1)
                                                putString("null", null)
                                                putString("string", "string")
                                            }
                                        )
                                    )
                                    putMap(
                                        "object",
                                        Bundle().apply {
                                            putBoolean("boolean", true)
                                            putDouble("double", 1.1)
                                            putInt("int", 1)
                                            putString("null", null)
                                            putString("string", "string")
                                            putSerializable(
                                                "array",
                                                arrayListOf(
                                                    true,
                                                    1.1,
                                                    1,
                                                    null,
                                                    "string",
                                                    arrayListOf(
                                                        true,
                                                        1.1,
                                                        1,
                                                        null,
                                                        "string",
                                                        arrayListOf(),
                                                        Bundle().apply {
                                                            putBoolean("boolean", true)
                                                            putDouble("double", 1.1)
                                                            putInt("int", 1)
                                                            putString("null", null)
                                                            putString("string", "string")
                                                        }
                                                    ),
                                                    Bundle().apply {
                                                        putBoolean("boolean", true)
                                                        putDouble("double", 1.1)
                                                        putInt("int", 1)
                                                        putString("null", null)
                                                        putString("string", "string")
                                                    }
                                                )
                                            )
                                        }
                                    )
                                }
                            )
                        },
                        null,
                        null
                    ),
                )
            )
        }
    }
}
`
    );
  });
});
