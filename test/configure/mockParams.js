//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check
// istanbul ignore file

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
    targetVersion: "^0.63.4",
    platforms: ["android", "ios", "macos", "windows"],
    flatten: false,
    force: false,
    init: false,
    ...overrides,
  };
}

exports.mockParams = mockParams;
