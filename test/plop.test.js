//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

/**
 * @typedef {import("../plopfile").Platform} Platform
 */

const plopfile = require("../plopfile")({
  // @ts-ignore stub of `NodePlopAPI.setGenerator`
  setGenerator: () => undefined,
});

describe("getScripts", () => {
  const { getScripts } = plopfile;

  const getSortedScripts = (/** @type {"all" | Platform} */ platform) => {
    const scripts = getScripts("Test", platform);
    return Object.keys(scripts)
      .filter((script) => Boolean(scripts[script]))
      .sort();
  };

  test("returns scripts for all platforms", () => {
    expect(getSortedScripts("all")).toEqual([
      "android",
      "build:android",
      "build:ios",
      "build:macos",
      "build:windows",
      "ios",
      "macos",
      "start",
      "start:macos",
      "start:windows",
      "windows",
    ]);
  });

  test("returns only scripts for Android", () => {
    expect(getSortedScripts("android")).toEqual([
      "android",
      "build:android",
      "start",
    ]);
  });

  test("returns only scripts for iOS", () => {
    expect(getSortedScripts("ios")).toEqual(["build:ios", "ios", "start"]);
  });

  test("returns only scripts for macOS", () => {
    expect(getSortedScripts("macos")).toEqual([
      "build:macos",
      "macos",
      "start:macos",
    ]);
  });

  test("returns only scripts for Windows", () => {
    expect(getSortedScripts("windows")).toEqual([
      "build:windows",
      "start:windows",
      "windows",
    ]);
  });
});

describe("includesPlatform", () => {
  const { includesPlatform } = plopfile;

  test("returns `true` for all supported platforms", () => {
    expect(includesPlatform("all", "android")).toBeTruthy();
    expect(includesPlatform("all", "ios")).toBeTruthy();
    expect(includesPlatform("all", "macos")).toBeTruthy();
    expect(includesPlatform("all", "windows")).toBeTruthy();

    // @ts-ignore intentional use of unsupported platform
    expect(includesPlatform("all", "dos")).toBeFalsy();
    // @ts-ignore intentional use of unsupported platform
    expect(includesPlatform("all", "nextstep")).toBeFalsy();
  });

  test("returns `true` only for Android", () => {
    expect(includesPlatform("android", "android")).toBeTruthy();
    expect(includesPlatform("android", "ios")).toBeFalsy();
    expect(includesPlatform("android", "macos")).toBeFalsy();
    expect(includesPlatform("android", "windows")).toBeFalsy();
  });

  test("returns `true` only for iOS", () => {
    expect(includesPlatform("ios", "android")).toBeFalsy();
    expect(includesPlatform("ios", "ios")).toBeTruthy();
    expect(includesPlatform("ios", "macos")).toBeFalsy();
    expect(includesPlatform("ios", "windows")).toBeFalsy();
  });

  test("returns `true` only for macOS", () => {
    expect(includesPlatform("macos", "android")).toBeFalsy();
    expect(includesPlatform("macos", "ios")).toBeFalsy();
    expect(includesPlatform("macos", "macos")).toBeTruthy();
    expect(includesPlatform("macos", "windows")).toBeFalsy();
  });

  test("returns `true` only for Windows", () => {
    expect(includesPlatform("windows", "android")).toBeFalsy();
    expect(includesPlatform("windows", "ios")).toBeFalsy();
    expect(includesPlatform("windows", "macos")).toBeFalsy();
    expect(includesPlatform("windows", "windows")).toBeTruthy();
  });
});

describe("isInstalled", () => {
  const { isInstalled } = plopfile;

  test("finds installed packages", () => {
    expect(isInstalled("react-native", false)).toBeTruthy();
    expect(
      isInstalled("this-package-does-not-exist-probably", false)
    ).toBeFalsy();
  });

  test("throws if a required package is not found", () => {
    expect(isInstalled("react-native", true)).toBeTruthy();
    expect(() =>
      isInstalled("this-package-does-not-exist-probably", true)
    ).toThrow();
  });
});

describe("sortByKeys", () => {
  const { sortByKeys } = plopfile;

  test("handles empty record", () => {
    expect(Object.keys(sortByKeys({}))).toEqual([]);
  });

  test("sorts keys in record", () => {
    const record = { b: "b", c: "c", a: "a" };
    expect(Object.keys(record)).toEqual(["b", "c", "a"]);
    expect(Object.keys(sortByKeys(record))).toEqual(["a", "b", "c"]);
  });
});
