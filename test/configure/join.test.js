//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("join()", () => {
  const { join } = require("../../scripts/configure");

  test("joins lines", () => {
    expect(join("")).toBe("");
    expect(join("a", "b")).toBe("a\nb");
    expect(join("a", "", "b")).toBe("a\n\nb");
    expect(join("a", "", "b", "")).toBe("a\n\nb\n");
  });
});
