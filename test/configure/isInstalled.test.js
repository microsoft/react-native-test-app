// @ts-check
"use strict";

describe("isInstalled()", () => {
  const { isInstalled } = require("../../scripts/configure");

  test("finds installed packages", () => {
    expect(isInstalled("react-native", false)).toBe(true);
    expect(isInstalled("this-package-does-not-exist-probably", false)).toBe(
      false
    );
  });

  test("throws if a required package is not found", () => {
    expect(isInstalled("react-native", true)).toBe(true);
    expect(() =>
      isInstalled("this-package-does-not-exist-probably", true)
    ).toThrow();
  });
});
