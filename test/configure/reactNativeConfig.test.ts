import { equal, ok } from "node:assert/strict";
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

    const withSinglePlatform = mockParams({ platforms: ["ios"] });
    equal(reactNativeConfig(withSinglePlatform), genericConfig);
  });
});
