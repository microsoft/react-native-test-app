import { deepEqual, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlatformPackage } from "../../scripts/configure.mjs";

describe("getPlatformPackage()", () => {
  const name = "react-native-macos";

  it("returns dependency when target version is inside range", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    for (const targetVersion of ["0.0.0-canary", "^0.0.0-canary"]) {
      const pkg = getPlatformPackage("macos", targetVersion);
      deepEqual(pkg, { [name]: "^0.0.0" });
    }

    for (const targetVersion of ["0.78", "0.78.6", "^0.78", "^0.78.6"]) {
      const pkg = getPlatformPackage("macos", targetVersion);
      deepEqual(pkg, { [name]: "^0.78.0" });
    }

    equal(warnMock.mock.calls.length, 0);
  });

  it("returns `undefined` when target version is outside range", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    const versions = ["0.75", "9999.0"];
    for (const targetVersion of versions) {
      const pkg = getPlatformPackage("macos", targetVersion);
      equal(pkg, undefined);
    }

    equal(warnMock.mock.calls.length, versions.length);
  });

  it("throws if target version is invalid", () => {
    // @ts-expect-error intentional use of empty string to elicit an exception
    throws(() => getPlatformPackage("", "version"));
  });
});
