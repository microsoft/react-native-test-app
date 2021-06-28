//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

describe("isDestructive()", () => {
  const { mockFiles } = require("../mockFiles");
  const { isDestructive } = require("../../scripts/configure");

  /**
   * Example output:
   *
   *   % ../scripts/configure.js
   *   [!] The following files will be overwritten:
   *            .watchmanconfig
   *            android/build.gradle
   *            android/gradle.properties
   *            android/settings.gradle
   *            babel.config.js
   *            ios/Podfile
   *            macos/Podfile
   *            metro.config.js
   *            react-native.config.js
   *   [!] The following files will be removed:
   *            ios/Podfile.lock
   *            macos/Podfile.lock
   *   [!] Destructive file operations are required.
   *   Re-run with --force if you're fine with this.
   *   %
   */
  const consoleSpy = jest.spyOn(global.console, "warn");

  afterEach(() => {
    mockFiles();
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns false when there are no files to modify", () => {
    expect(
      isDestructive(".", {
        scripts: {},
        dependencies: {},
        files: {},
        oldFiles: [],
      })
    ).toBe(false);
  });

  test("returns true when there are files to overwrite", () => {
    const config = {
      scripts: {},
      dependencies: {},
      files: {
        "metro.config.js": "module.exports = {};",
      },
      oldFiles: [],
    };

    expect(isDestructive(".", config)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledTimes(0);

    mockFiles(["metro.config.js", ""]);

    expect(isDestructive(".", config)).toBe(true);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  test("returns true when there are files to remove", () => {
    const config = {
      scripts: {},
      dependencies: {},
      files: {
        "metro.config.js": "module.exports = {};",
      },
      oldFiles: ["Podfile.lock"],
    };

    expect(isDestructive(".", config)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledTimes(0);

    mockFiles(["Podfile.lock", ""]);

    expect(isDestructive(".", config)).toBe(true);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  test("enumerates all files that need to be modified", () => {
    const config = {
      scripts: {},
      dependencies: {},
      files: {
        "babel.config.js": "module.exports = {};",
        "metro.config.js": "module.exports = {};",
        "react-native.config.js": "module.exports = {};",
      },
      oldFiles: ["Podfile.lock"],
    };

    expect(isDestructive(".", config)).toBe(false);
    expect(consoleSpy).toHaveBeenCalledTimes(0);

    mockFiles(
      ["Podfile.lock", ""],
      ["babel.config.js", ""],
      ["metro.config.js", ""]
    );

    expect(isDestructive(".", config)).toBe(true);
    expect(consoleSpy).toHaveBeenCalledTimes(5);
    // 2 x "The following files..." + number of files
  });
});
