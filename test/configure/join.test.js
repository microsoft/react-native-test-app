// @ts-check
"use strict";

describe("join()", () => {
  const { join } = require("../../scripts/configure");

  test("joins lines", () => {
    expect(join("")).toBe("");
    expect(join("a", "b")).toBe("a\nb");
    expect(join("a", "", "b")).toBe("a\n\nb");
    expect(join("a", "", "b", "")).toBe("a\n\nb\n");
  });
});
