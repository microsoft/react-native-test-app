// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { generate as generateActual } from "../../scripts/embed-manifest/kotlin.mjs";
import * as fixtures from "./fixtures.mjs";

describe("embed manifest (Kotlin)", () => {
  /** @type {(json: Record<string, unknown>) => string} */
  const generate = (json) => generateActual(json, "0");

  it("generates all properties", () => {
    equal(
      generate(fixtures.simple),
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
                        "Example",
                        null,
                        null,
                        null
                    ),
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
    equal(
      generate(fixtures.minimum),
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
                arrayListOf<Any>()
            )
        }
    }
}
`
    );
  });

  it("handles valid JSON data types", () => {
    equal(
      generate(fixtures.extended),
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
                                        arrayListOf<Any>(),
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
                            putBundle(
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
                                                arrayListOf<Any>(),
                                                Bundle().apply {
                                                    putBoolean("boolean", true)
                                                    putDouble("double", 1.1)
                                                    putInt("int", 1)
                                                    putString("null", null)
                                                    putString("string", "string")
                                                }
                                            ),
                                            Bundle()
                                        )
                                    )
                                    putBundle(
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
                                                        arrayListOf<Any>(),
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
