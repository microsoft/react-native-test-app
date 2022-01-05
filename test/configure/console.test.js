// @ts-check
"use strict";

describe("console", () => {
  const { error, warn } = require("../../scripts/configure");

  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  afterEach(() => {
    consoleErrorSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("error() is just a fancy console.error()", () => {
    error("These tests are seriously lacking Arnold.");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
  });

  test("warn() is just a fancy console.warn()", () => {
    warn("These tests are lacking Arnold.");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });
});

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
