//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

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
    expect(reactNativeConfig(params)).toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).not.toContain(
      "ReactTestApp-Dummy.xcodeproj"
    );
    expect(reactNativeConfig(params)).not.toContain("ReactTestApp.vcxproj");
  });

  test("returns iOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["ios"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).toContain("ReactTestApp-Dummy.xcodeproj");
    expect(reactNativeConfig(params)).not.toContain("ReactTestApp.vcxproj");
  });

  test("returns macOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["macos"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).toContain("ReactTestApp-Dummy.xcodeproj");
    expect(reactNativeConfig(params)).not.toContain("ReactTestApp.vcxproj");
  });

  test("returns Windows specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["windows"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).not.toContain(
      "ReactTestApp-Dummy.xcodeproj"
    );
    expect(reactNativeConfig(params)).toContain("ReactTestApp.vcxproj");
  });

  test("throws when an unknown platform is specified", () => {
    // @ts-ignore intentional use of unsupported platform
    const params = mockParams({ platforms: ["nextstep"], flatten: true });
    expect(() => reactNativeConfig(params)).toThrow(
      "Unknown platform: nextstep"
    );
  });
});
