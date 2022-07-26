// @ts-check
// istanbul ignore file
"use strict";

/**
 * Returns mock parameters.
 * @param {Partial<import("../../scripts/configure").ConfigureParams>} [overrides]
 * @returns {import("../../scripts/configure").ConfigureParams}
 */
function mockParams(overrides) {
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

exports.mockParams = mockParams;
