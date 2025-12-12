/* node:coverage disable */
import type { ConfigureParams } from "../../scripts/types.ts";

/**
 * Returns mock parameters.
 */
export function mockParams(
  overrides?: Partial<ConfigureParams>
): ConfigureParams {
  return {
    name: "Test",
    packagePath: "test",
    testAppPath: ".",
    targetVersion: "0.76.8",
    platforms: ["android", "ios", "macos", "windows"],
    force: false,
    init: false,
    ...overrides,
  };
}
