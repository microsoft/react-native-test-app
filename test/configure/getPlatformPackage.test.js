//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

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

    ["0.63", "0.63.4", "^0.63", "^0.63.4"].forEach((targetVersion) => {
      const pkg = getPlatformPackage(name, targetVersion);
      expect(pkg).toEqual({ [name]: "^0.63.0" });
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
