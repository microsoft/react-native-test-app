// @ts-check
import { deepEqual, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlatformPackage } from "../../scripts/configure.js";
import { spy } from "../spy.mjs";

describe("getPlatformPackage()", () => {
  const name = "react-native";

  it("returns dependency when target version is inside range", (t) => {
    t.mock.method(console, "warn", () => null);

    for (const targetVersion of ["0.0.0-canary", "^0.0.0-canary"]) {
      const pkg = getPlatformPackage(name, targetVersion);
      deepEqual(pkg, { [name]: "^0.0.0" });
    }

    for (const targetVersion of ["0.68", "0.68.2", "^0.68", "^0.68.2"]) {
      const pkg = getPlatformPackage(name, targetVersion);
      deepEqual(pkg, { [name]: "^0.68.0" });
    }

    equal(spy(console.warn).calls.length, 0);
  });

  it("returns `undefined` when target version is outside range", (t) => {
    t.mock.method(console, "warn", () => null);

    const versions = ["0.59", "9999.0"];
    for (const targetVersion of versions) {
      const pkg = getPlatformPackage(name, targetVersion);
      equal(pkg, undefined);
    }

    equal(spy(console.warn).calls.length, versions.length);
  });

  it("throws if target version is invalid", () => {
    // @ts-expect-error intentional use of empty string to elicit an exception
    throws(() => getPlatformPackage("", "version"));
  });
});
