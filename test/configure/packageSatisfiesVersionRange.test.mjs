// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { packageSatisfiesVersionRange } from "../../scripts/configure.js";

describe("packageSatisfiesVersionRange()", () => {
  it("returns true when a package satisfies version range", () => {
    equal(packageSatisfiesVersionRange(".", "^0.0.1-0"), true);
    equal(packageSatisfiesVersionRange(".", "~0.0.1-0"), true);
  });

  it("returns false when a package does not satisfy version range", () => {
    equal(packageSatisfiesVersionRange(".", ">=0.0.1"), false);
    equal(packageSatisfiesVersionRange(".", "^0.0.0"), false);
  });
});
