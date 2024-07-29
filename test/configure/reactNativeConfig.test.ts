import { equal, fail, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { reactNativeConfig as reactNativeConfigActual } from "../../scripts/configure.mjs";
import type { ConfigureParams } from "../../scripts/types.js";
import { mockParams } from "./mockParams.js";

describe("reactNativeConfig()", () => {
  const reactNativeConfig = (params: ConfigureParams): string => {
    const config = reactNativeConfigActual(params);
    if (typeof config !== "string") {
      throw new Error("Expected a string");
    }
    return config;
  };

  it("returns generic config for all platforms", () => {
    const genericConfig = reactNativeConfig(mockParams());
    ok(genericConfig.includes("android: {"));
    ok(genericConfig.includes("ios: {"));
    ok(genericConfig.includes("windows: {"));

    const withFlattenOnly = mockParams({ flatten: true });
    equal(reactNativeConfig(withFlattenOnly), genericConfig);

    const withFlattenInit = mockParams({ flatten: true, init: true });
    equal(reactNativeConfig(withFlattenInit), genericConfig);

    const withSinglePlatform = mockParams({ platforms: ["ios"] });
    equal(reactNativeConfig(withSinglePlatform), genericConfig);
  });

  it("returns Android specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["android"], flatten: true });
    ok(reactNativeConfig(params).includes("android: {"));
    ok(!reactNativeConfig(params).includes("ios: {"));
    ok(!reactNativeConfig(params).includes("windows: {"));
  });

  it("returns iOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["ios"], flatten: true });
    ok(!reactNativeConfig(params).includes("android: {"));
    ok(reactNativeConfig(params).includes("ios: {"));
    ok(!reactNativeConfig(params).includes("windows: {"));
  });

  it("returns macOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["macos"], flatten: true });
    ok(!reactNativeConfig(params).includes("android: {"));
    ok(reactNativeConfig(params).includes("ios: {"));
    ok(!reactNativeConfig(params).includes("windows: {"));
  });

  it("returns Windows specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["windows"], flatten: true });
    ok(!reactNativeConfig(params).includes("android: {"));
    ok(!reactNativeConfig(params).includes("ios: {"));
    ok(reactNativeConfig(params).includes("windows: {"));
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
