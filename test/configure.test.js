//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

const fs = require("fs");
const path = require("path");

/**
 * Adds mock files.
 * @param {...[string, unknown]} files
 */
function mockFiles(...files) {
  // @ts-ignore `__setMockFiles`
  fs.__setMockFiles(
    Object.fromEntries(
      files.map(([filename, content]) => [filename, JSON.stringify(content)])
    )
  );
}

/**
 * Returns mock parameters.
 * @param {Partial<import("../scripts/configure").ConfigureParams>=} overrides
 * @returns {import("../scripts/configure").ConfigureParams}
 */
function mockParams(overrides) {
  return {
    name: "Test",
    packagePath: "test",
    testAppPath: "..",
    platforms: ["android", "ios", "macos", "windows"],
    flatten: false,
    force: false,
    init: false,
    ...overrides,
  };
}

describe("console helpers", () => {
  const { error, warn } = require("../scripts/configure");

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

describe("gatherConfig()", () => {
  const { gatherConfig } = require("../scripts/configure");

  beforeAll(() => {
    mockFiles([
      path.join(
        require.resolve("react-native/template/package.json"),
        "..",
        "_watchmanconfig"
      ),
      {},
    ]);
  });

  afterAll(() => {
    mockFiles();
  });

  test("returns configuration for all platforms", () => {
    expect(gatherConfig(mockParams())).toMatchSnapshot();
  });

  test("returns configuration for a single platform", () => {
    expect(gatherConfig(mockParams({ platforms: ["ios"] }))).toMatchSnapshot();
  });

  test("returns configuration for arbitrary platforms", () => {
    const params = mockParams({ platforms: ["android", "ios"] });
    expect(gatherConfig(params)).toMatchSnapshot();
  });

  test("flattens configuration for a single platform only", () => {
    const iosOnly = mockParams({ platforms: ["ios"], flatten: true });
    expect(gatherConfig(iosOnly)).toMatchSnapshot();

    const mobile = mockParams({ platforms: ["android", "ios"], flatten: true });
    expect(gatherConfig(mobile)).toMatchSnapshot();
  });
});

describe("getConfig()", () => {
  const { getConfig } = require("../scripts/configure");

  beforeAll(() => {
    mockFiles([
      path.join(
        require.resolve("react-native/template/package.json"),
        "..",
        "_watchmanconfig"
      ),
      {},
    ]);
  });

  afterAll(() => {
    mockFiles();
  });

  test("returns Android specific scripts and additional files", () => {
    const config = getConfig(mockParams(), "android");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "android",
      "build:android",
    ]);
    expect(Object.keys(config.dependencies)).toEqual([]);
    expect(Object.keys(config.files).sort()).toEqual([
      "build.gradle",
      "gradle.properties",
      "gradle/wrapper/gradle-wrapper.jar",
      "gradle/wrapper/gradle-wrapper.properties",
      "gradlew",
      "gradlew.bat",
      "settings.gradle",
    ]);
  });

  test("returns iOS specific scripts and additional files", () => {
    const config = getConfig(mockParams(), "ios");

    expect(Object.keys(config.scripts).sort()).toEqual(["build:ios", "ios"]);
    expect(Object.keys(config.dependencies)).toEqual([]);
    expect(Object.keys(config.files).sort()).toEqual(["Podfile"]);
    expect(config.oldFiles.sort()).toEqual([
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  test("returns macOS specific scripts and additional files", () => {
    const config = getConfig(mockParams(), "macos");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "build:macos",
      "macos",
    ]);
    expect(Object.keys(config.files).sort()).toEqual(["Podfile"]);
    expect(Object.keys(config.dependencies)).toEqual(["react-native-macos"]);
    expect(config.oldFiles.sort()).toEqual([
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  test("returns Windows specific scripts and additional files", () => {
    const config = getConfig(mockParams(), "windows");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "build:windows",
      "start:windows",
      "windows",
    ]);
    expect(Object.keys(config.dependencies)).toEqual(["react-native-windows"]);
    expect(Object.keys(config.files).sort()).toEqual([]);
    expect(config.oldFiles.sort()).toEqual([
      "Test.sln",
      "Test.vcxproj",
      "Test/Test.vcxproj",
    ]);
  });
});

describe("getAppName()", () => {
  const { getAppName } = require("../scripts/configure");

  const consoleSpy = jest.spyOn(global.console, "warn");

  afterEach(() => {
    mockFiles();
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("retrieves name from the app manifest", () => {
    mockFiles(["app.json", { name: "Example" }]);
    expect(getAppName(".")).toBe("Example");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("falls back to 'ReactTestApp' if `name` is missing or empty", () => {
    mockFiles(["app.json", {}]);
    expect(getAppName(".")).toBe("ReactTestApp");

    mockFiles(["app.json", { name: "" }]);
    expect(getAppName(".")).toBe("ReactTestApp");

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("falls back to 'ReactTestApp' if the app manifest is missing", () => {
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});

describe("isDestructive()", () => {
  const { isDestructive } = require("../scripts/configure");

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
   *            metro.config.windows.js
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

describe("isInstalled()", () => {
  const { isInstalled } = require("../scripts/configure");

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

describe("join()", () => {
  const { join } = require("../scripts/configure");

  test("joins lines", () => {
    expect(join("")).toBe("");
    expect(join("a", "b")).toBe("a\nb");
    expect(join("a", "", "b")).toBe("a\n\nb");
    expect(join("a", "", "b", "")).toBe("a\n\nb\n");
  });
});

describe("mergeConfig()", () => {
  const { mergeConfig } = require("../scripts/configure");

  test("merges empty configs", () => {
    expect(
      mergeConfig(
        {
          scripts: {},
          dependencies: {},
          files: {},
          oldFiles: [],
        },
        {
          scripts: {},
          dependencies: {},
          files: {},
          oldFiles: [],
        }
      )
    ).toEqual({
      scripts: {},
      dependencies: {},
      files: {},
      oldFiles: [],
    });
  });

  test("ignore empty config on rhs", () => {
    expect(
      mergeConfig(
        {
          scripts: {
            start: "react-native start",
          },
          dependencies: {},
          files: {
            "metro.config.js": "module.exports = {};",
          },
          oldFiles: ["ios/Example.xcodeproj"],
        },
        {
          scripts: {},
          dependencies: {},
          files: {},
          oldFiles: [],
        }
      )
    ).toEqual({
      scripts: {
        start: "react-native start",
      },
      dependencies: {},
      files: {
        "metro.config.js": "module.exports = {};",
      },
      oldFiles: ["ios/Example.xcodeproj"],
    });
  });

  test("overwrites lhs if rhs has the same entry", () => {
    expect(
      mergeConfig(
        {
          scripts: {
            start: "react-native start",
          },
          dependencies: {},
          files: {
            "babel.config.js": "module.exports = {};",
          },
          oldFiles: ["ios/Example.xcodeproj"],
        },
        {
          scripts: {
            start: "react-native custom start",
          },
          dependencies: {},
          files: {
            "metro.config.js": "module.exports = {};",
          },
          oldFiles: ["ios/Example.xcodeproj"],
        }
      )
    ).toEqual({
      scripts: {
        start: "react-native custom start",
      },
      dependencies: {},
      files: {
        "babel.config.js": "module.exports = {};",
        "metro.config.js": "module.exports = {};",
      },
      oldFiles: ["ios/Example.xcodeproj", "ios/Example.xcodeproj"],
    });
  });
});

describe("projectRelativePath()", () => {
  const { projectRelativePath } = require("../scripts/configure");

  test("returns path relative to package with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
    });
    expect(projectRelativePath(params)).toEqual(
      "../../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to package with platform specific folders (flatten=true)", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      flatten: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to package with flattened structure", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-ios",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      platforms: ["ios"],
      flatten: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to new app with platform specific folders (flatten=true)", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      flatten: true,
      init: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to new app with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      init: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to new app with flattened structure", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-ios",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      platforms: ["ios"],
      flatten: true,
      init: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "node_modules/react-native-test-app"
    );
  });
});

describe("reactNativeConfig()", () => {
  const { reactNativeConfig } = require("../scripts/configure");

  test("returns generic config for all platforms", () => {
    const genericConfig = reactNativeConfig(mockParams());
    expect(typeof genericConfig).toEqual("object");

    const withFlattenOnly = mockParams({ flatten: true });
    expect(reactNativeConfig(withFlattenOnly)).toEqual(genericConfig);

    const withFlattenInit = mockParams({ flatten: true, init: true });
    expect(reactNativeConfig(withFlattenInit)).toEqual(genericConfig);

    const withSinglePlatform = mockParams({ platforms: ["ios"] });
    expect(reactNativeConfig(withSinglePlatform)).toEqual(genericConfig);
  });

  test("returns Android specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["android"], flatten: true });
    expect(reactNativeConfig(params)).toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).not.toContain(
      "ReactTestApp-Dummy.xcodeproj"
    );
    expect(reactNativeConfig(params)).not.toContain("ReactTestApp.vcxproj");
  });

  test("returns iOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["ios"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).toContain("ReactTestApp-Dummy.xcodeproj");
    expect(reactNativeConfig(params)).not.toContain("ReactTestApp.vcxproj");
  });

  test("returns macOS specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["macos"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).toContain("ReactTestApp-Dummy.xcodeproj");
    expect(reactNativeConfig(params)).not.toContain("ReactTestApp.vcxproj");
  });

  test("returns Windows specific config for a flatten structure", () => {
    const params = mockParams({ platforms: ["windows"], flatten: true });
    expect(reactNativeConfig(params)).not.toContain("AndroidManifest.xml");
    expect(reactNativeConfig(params)).not.toContain(
      "ReactTestApp-Dummy.xcodeproj"
    );
    expect(reactNativeConfig(params)).toContain("ReactTestApp.vcxproj");
  });
});

describe("removeAllFiles()", () => {
  const { removeAllFiles } = require("../scripts/configure");

  beforeEach(() => {
    mockFiles(
      ["babel.config.js", "module.exports = {};"],
      ["metro.config.js", "module.exports = {};"]
    );
  });

  test("removes all specified files", () => {
    removeAllFiles(["babel.config.js", "metro.config.js"], ".");
    expect(fs.readFileSync("babel.config.js")).toBeUndefined();
    expect(fs.readFileSync("metro.config.js")).toBeUndefined();
  });

  test("ignores non-existent files", () => {
    removeAllFiles(["babel.config.js", "react-native.config.js"], ".");
    expect(fs.readFileSync("babel.config.js")).toBeUndefined();
    expect(fs.readFileSync("metro.config.js")).toBeDefined();
  });
});

describe("updatePackageManifest()", () => {
  const { updatePackageManifest } = require("../scripts/configure");

  afterEach(() => mockFiles());

  test("adds `scripts` field if missing", () => {
    mockFiles(["package.json", { key: "value" }]);

    const config = {
      scripts: {
        test: "jest",
      },
      dependencies: {},
      files: {},
      oldFiles: [],
    };

    expect(updatePackageManifest("package.json", config)).toEqual({
      key: "value",
      scripts: {
        test: "jest",
      },
      dependencies: {},
      devDependencies: {
        mkdirp: "^1.0.0",
        "react-native-test-app": "^0.0.1-dev",
      },
    });
  });

  test("adds to existing `scripts` field", () => {
    mockFiles([
      "package.json",
      {
        key: "value",
        scripts: {
          test: "jest",
        },
      },
    ]);

    const config = {
      scripts: {
        run: "run",
      },
      dependencies: {},
      files: {},
      oldFiles: [],
    };

    expect(updatePackageManifest("package.json", config)).toEqual({
      key: "value",
      scripts: {
        run: "run",
        test: "jest",
      },
      dependencies: {},
      devDependencies: {
        mkdirp: "^1.0.0",
        "react-native-test-app": "^0.0.1-dev",
      },
    });
  });
});

describe("writeAllFiles()", () => {
  const { writeAllFiles } = require("../scripts/configure");

  afterEach(() => {
    mockFiles();
  });

  test("writes all files to disk", async () => {
    await writeAllFiles(
      {
        file1: "1",
        file2: "2",
      },
      "test"
    );

    expect(fs.readFileSync(path.join("test", "file1"))).toBe("1");
    expect(fs.readFileSync(path.join("test", "file2"))).toBe("2");
  });

  test("ignores files with no content", async () => {
    await writeAllFiles(
      {
        file1: "1",
        file2: "2",
        file3: "",
      },
      "."
    );

    expect(fs.readFileSync("file1")).toBe("1");
    expect(fs.readFileSync("file2")).toBe("2");
    expect(fs.readFileSync("file3")).toBeUndefined();
  });

  test("rethrows write exceptions", async () => {
    await expect(
      writeAllFiles(
        {
          file1: "1",
          file2: "2",
          "": "3", // This entry will throw an exception
        },
        "."
      )
    ).rejects.toThrow();

    expect(fs.readFileSync("file1")).toBe("1");
    expect(fs.readFileSync("file2")).toBe("2");
    expect(fs.readFileSync("")).toBeUndefined();
  });
});
