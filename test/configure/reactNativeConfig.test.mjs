// @ts-check
import { equal, fail, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { reactNativeConfig as reactNativeConfigActual } from "../../scripts/configure.js";
import { mockParams } from "./mockParams.mjs";

describe("reactNativeConfig()", () => {
  /** @type {(params: import("../../scripts/configure").ConfigureParams) => string} */
  const reactNativeConfig = (params) => {
    const config = reactNativeConfigActual(params);
    if (typeof config !== "string") {
      throw new Error("Expected a string");
    }
    return config;
  };

  it("returns generic config for all platforms", () => {
    const genericConfig = reactNativeConfig(mockParams());
    equal(genericConfig.includes("android: {"), true);
    equal(genericConfig.includes("ios: {"), true);
    equal(genericConfig.includes("windows: {"), true);

    const withFlattenOnly = mockParams({ flatten: true });
    equal(reactNativeConfig(withFlattenOnly), genericConfig);

    const withFlattenInit = mockParams({ flatten: true, init: true });
    equal(reactNativeConfig(withFlattenInit), genericConfig);

    const withSinglePlatform = mockParams({ platforms: ["ios"] });
    equal(reactNativeConfig(withSinglePlatform), genericConfig);
  });

  it("returns Android specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["android"], flatten: true });
    equal(reactNativeConfig(params).includes("android: {"), true);
    equal(reactNativeConfig(params).includes("ios: {"), false);
    equal(reactNativeConfig(params).includes("windows: {"), false);
  });

  it("returns iOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["ios"], flatten: true });
    equal(reactNativeConfig(params).includes("android: {"), false);
    equal(reactNativeConfig(params).includes("ios: {"), true);
    equal(reactNativeConfig(params).includes("windows: {"), false);
  });

  it("returns macOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["macos"], flatten: true });
    equal(reactNativeConfig(params).includes("android: {"), false);
    equal(reactNativeConfig(params).includes("ios: {"), true);
    equal(reactNativeConfig(params).includes("windows: {"), false);
  });

  it("returns Windows specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["windows"], flatten: true });
    equal(reactNativeConfig(params).includes("android: {"), false);
    equal(reactNativeConfig(params).includes("ios: {"), false);
    equal(reactNativeConfig(params).includes("windows: {"), true);
  });

  it("throws when an unknown platform is specified", () => {
    // @ts-expect-error intentional use of unsupported platform
    const params = mockParams({ platforms: ["nextstep"], flatten: true });
    throws(
      () => reactNativeConfig(params),
      (err) => {
        if (!(err instanceof Error)) {
          fail("Expected an Error ");
        }
        equal(err.message, "Unknown platform: nextstep");
        return true;
      }
    );
  });
});
