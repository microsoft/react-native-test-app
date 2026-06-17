import { deepEqual, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { getPlatformPackage } from "../../scripts/configure.mjs";

describe("getPlatformPackage()", () => {
  const macosName = "react-native-macos";
  const windowsName = "react-native-windows";

  it("returns dependency when target version is inside range", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    for (const targetVersion of ["0.0.0-canary", "^0.0.0-canary"]) {
      const pkg = getPlatformPackage("macos", targetVersion);
      deepEqual(pkg, { [macosName]: "^0.0.0" });
    }

    for (const targetVersion of ["0.78", "0.78.6", "^0.78", "^0.78.6"]) {
      const pkg = getPlatformPackage("macos", targetVersion);
      deepEqual(pkg, { [macosName]: "^0.78.0" });
    }

    for (const targetVersion of ["0.81", "0.81.0", "^0.81", "^0.81.0"]) {
      const pkg = getPlatformPackage("macos", targetVersion);
      deepEqual(pkg, { [macosName]: "^0.81.0" });
    }

    equal(warnMock.mock.calls.length, 0);
  });

  it("returns dependency for windows when target version is inside range", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    for (const targetVersion of ["0.80", "0.80.0", "^0.80", "^0.80.0"]) {
      const pkg = getPlatformPackage("windows", targetVersion);
      deepEqual(pkg, { [windowsName]: "^0.80.0" });
    }

    for (const targetVersion of ["0.81", "0.81.0", "^0.81", "^0.81.0"]) {
      const pkg = getPlatformPackage("windows", targetVersion);
      deepEqual(pkg, { [windowsName]: "^0.81.0" });
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
    throws(() => getPlatformPackage("macos", "version"));
  });

  it("returns an empty record for Android and iOS", () => {
    for (const platform of ["common", "android", "ios"] as const) {
      deepEqual(getPlatformPackage(platform, "version"), {});
    }
  });

  it("returns an empty record for unsupported platforms", () => {
    for (const platform of ["linux", "win32"] as const) {
      // @ts-expect-error intentional use of unsupported platforms
      deepEqual(getPlatformPackage(platform, "version"), {});
    }
  });
});
