// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { join } from "../../scripts/configure.js";

describe("join()", () => {
  it("joins lines", () => {
    equal(join(""), "");
    equal(join("a", "b"), "a\nb");
    equal(join("a", "", "b"), "a\n\nb");
    equal(join("a", "", "b", ""), "a\n\nb\n");
  });
});
