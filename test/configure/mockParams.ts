/* node:coverage disable */
import type { ConfigureParams } from "../../scripts/types.js";

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
    targetVersion: "^0.68.2",
    platforms: ["android", "ios", "macos", "windows"],
    flatten: false,
    force: false,
    init: false,
    ...overrides,
  };
}
