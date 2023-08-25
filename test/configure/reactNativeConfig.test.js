// @ts-check
"use strict";

describe("reactNativeConfig()", () => {
  const { mockParams } = require("./mockParams");
  const { reactNativeConfig } = require("../../scripts/configure");

  test("returns generic config for all platforms", () => {
    const genericConfig = reactNativeConfig(mockParams());
    expect(genericConfig).toContain("android: {");
    expect(genericConfig).toContain("ios: {");
    expect(genericConfig).toContain("windows: {");

    const withFlattenOnly = mockParams({ flatten: true });
    expect(reactNativeConfig(withFlattenOnly)).toEqual(genericConfig);

    const withFlattenInit = mockParams({ flatten: true, init: true });
    expect(reactNativeConfig(withFlattenInit)).toEqual(genericConfig);

    const withSinglePlatform = mockParams({ platforms: ["ios"] });
    expect(reactNativeConfig(withSinglePlatform)).toEqual(genericConfig);
  });

  test("returns Android specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["android"], flatten: true });
    expect(reactNativeConfig(params)).toContain("android: {");
    expect(reactNativeConfig(params)).not.toContain("ios: {");
    expect(reactNativeConfig(params)).not.toContain("windows: {");
  });

  test("returns iOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["ios"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("android: {");
    expect(reactNativeConfig(params)).toContain("ios: {");
    expect(reactNativeConfig(params)).not.toContain("windows: {");
  });

  test("returns macOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["macos"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("android: {");
    expect(reactNativeConfig(params)).toContain("ios: {");
    expect(reactNativeConfig(params)).not.toContain("windows: {");
  });

  test("returns Windows specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["windows"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("android: {");
    expect(reactNativeConfig(params)).not.toContain("ios: {");
    expect(reactNativeConfig(params)).toContain("windows: {");
  });

  test("throws when an unknown platform is specified", () => {
    // @ts-expect-error intentional use of unsupported platform
    const params = mockParams({ platforms: ["nextstep"], flatten: true });
    expect(() => reactNativeConfig(params)).toThrow(
      "Unknown platform: nextstep"
    );
  });
});
