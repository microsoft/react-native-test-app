// @ts-check
"use strict";

describe("reactNativeConfig()", () => {
  const { mockParams } = require("./mockParams");
  const { reactNativeConfig } = require("../../scripts/configure");

  test("returns generic config for all platforms", () => {
    const genericConfig = reactNativeConfig(mockParams());
    expect(genericConfig).toContain("android: {");
    expect(genericConfig).toContain("ios: {");
    expect(genericConfig).toContain("windows: fs.exists");

    const withFlattenOnly = mockParams({ flatten: true });
    expect(reactNativeConfig(withFlattenOnly)).toEqual(genericConfig);

    const withFlattenInit = mockParams({ flatten: true, init: true });
    expect(reactNativeConfig(withFlattenInit)).toEqual(genericConfig);

    const withSinglePlatform = mockParams({ platforms: ["ios"] });
    expect(reactNativeConfig(withSinglePlatform)).toEqual(genericConfig);
  });

  test("returns Android specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["android"], flatten: true });
    expect(reactNativeConfig(params)).toContain("androidManifestPath");
    expect(reactNativeConfig(params)).not.toContain("iosProjectPath");
    expect(reactNativeConfig(params)).not.toContain("windowsProjectPath");
  });

  test("returns iOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["ios"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("androidManifestPath");
    expect(reactNativeConfig(params)).toContain("iosProjectPath");
    expect(reactNativeConfig(params)).not.toContain("windowsProjectPath");
  });

  test("returns macOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["macos"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("androidManifestPath");
    expect(reactNativeConfig(params)).toContain("iosProjectPath");
    expect(reactNativeConfig(params)).not.toContain("windowsProjectPath");
  });

  test("returns Windows specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["windows"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("androidManifestPath");
    expect(reactNativeConfig(params)).not.toContain("iosProjectPath");
    expect(reactNativeConfig(params)).toContain("windowsProjectPath");
  });

  test("throws when an unknown platform is specified", () => {
    // @ts-ignore intentional use of unsupported platform
    const params = mockParams({ platforms: ["nextstep"], flatten: true });
    expect(() => reactNativeConfig(params)).toThrow(
      "Unknown platform: nextstep"
    );
  });
});
