// @ts-check
/* node:coverage disable */

/**
 * Returns mock parameters.
 * @param {Partial<import("../../scripts/types.js").ConfigureParams>} [overrides]
 * @returns {import("../../scripts/types.js").ConfigureParams}
 */
export function mockParams(overrides) {
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
