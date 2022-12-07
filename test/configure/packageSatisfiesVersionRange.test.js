// @ts-check
"use strict";

describe("packageSatisfiesVersionRange()", () => {
  const { packageSatisfiesVersionRange } = require("../../scripts/configure");

  test("returns true when a package satisfies version range", () => {
    expect(packageSatisfiesVersionRange(".", "^0.0.1-0")).toBe(true);
    expect(packageSatisfiesVersionRange(".", "~0.0.1-0")).toBe(true);
  });

  test("returns false when a package does not satisfy version range", () => {
    expect(packageSatisfiesVersionRange(".", ">=0.0.1")).toBe(false);
    expect(packageSatisfiesVersionRange(".", "^0.0.0")).toBe(false);
  });
});
