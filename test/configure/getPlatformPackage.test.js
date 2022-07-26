// @ts-check
"use strict";

describe("getPlatformPackage()", () => {
  const { getPlatformPackage } = require("../../scripts/configure");

  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  const name = "react-native";

  afterEach(() => {
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns dependency when target version is inside range", () => {
    ["0.0.0-canary", "^0.0.0-canary"].forEach((targetVersion) => {
      const pkg = getPlatformPackage(name, targetVersion);
      expect(pkg).toEqual({ [name]: "^0.0.0" });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    ["0.68", "0.68.2", "^0.68", "^0.68.2"].forEach((targetVersion) => {
      const pkg = getPlatformPackage(name, targetVersion);
      expect(pkg).toEqual({ [name]: "^0.68.0" });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  test("returns `undefined` when target version is outside range", () => {
    ["0.59", "9999.0"].forEach((targetVersion) => {
      const pkg = getPlatformPackage(name, targetVersion);
      expect(pkg).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockReset();
    });
  });

  test("throws if target version is invalid", () => {
    // @ts-ignore intentional use of empty string to elicit an exception
    expect(() => getPlatformPackage("", "version")).toThrow();
  });
});
