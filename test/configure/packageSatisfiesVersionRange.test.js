//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("packageSatisfiesVersionRange()", () => {
  const { packageSatisfiesVersionRange } = require("../../scripts/configure");

  test("returns true when a package satisfies version range", () => {
    expect(packageSatisfiesVersionRange("..", "^0.0.1-0")).toBe(true);
    expect(packageSatisfiesVersionRange("..", "~0.0.1-0")).toBe(true);
  });

  test("returns false when a package does not satisfy version range", () => {
    expect(packageSatisfiesVersionRange("..", ">=0.0.1")).toBe(false);
    expect(packageSatisfiesVersionRange("..", "^0.0.0")).toBe(false);
  });
});
