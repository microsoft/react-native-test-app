import { deepEqual, equal, fail, ok, throws } from "node:assert/strict";
import * as fs from "node:fs";
import { afterEach, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { generateProject as generateProjectActual } from "../../ios/app.mjs";
import { USER_HEADER_SEARCH_PATHS } from "../../ios/xcode.mjs";
import { readTextFile } from "../../scripts/helpers.js";
import type {
  ApplePlatform,
  JSONObject,
  ProjectConfiguration,
} from "../../scripts/types.ts";
import { fs as mockfs, setMockFiles, toJSON } from "../fs.mock.ts";

const macosOnly = { skip: process.platform === "win32" };

describe("generateProject()", macosOnly, () => {
  function generateProject(
    projectRoot: string,
    platform: ApplePlatform,
    options: JSONObject
  ): ProjectConfiguration {
    return generateProjectActual(projectRoot, platform, options, mockfs);
  }

  function makeMockProject(overrides?: Record<string, unknown>) {
    const manifestURL = new URL("../../package.json", import.meta.url);
    const manifest = readTextFile(fileURLToPath(manifestURL));
    const { name, version, defaultPlatformPackages } = JSON.parse(manifest);
    return {
      "app.json": JSON.stringify({ name: "ContosoApp", ...overrides }),
      "ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme":
        "",
      "ios/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json": "",
      "ios/ReactTestApp/Assets.xcassets/Contents.json": "",
      "ios/ReactTestApp/Info.plist": "",
      "ios/ReactTestAppTests/Info.plist": "",
      "ios/ReactTestAppUITests/Info.plist": "",
      "macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme":
        "",
      "macos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json": "",
      "macos/ReactTestApp/Assets.xcassets/Contents.json": "",
      "macos/ReactTestApp/Info.plist": "",
      "macos/ReactTestAppTests/Info.plist": "",
      "macos/ReactTestAppUITests/Info.plist": "",
      "visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme":
        "",
      "visionos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json": "",
      "visionos/ReactTestApp/Assets.xcassets/Contents.json": "",
      "visionos/ReactTestApp/Info.plist": "",
      "visionos/ReactTestAppTests/Info.plist": "",
      "visionos/ReactTestAppUITests/Info.plist": "",
      "package.json": JSON.stringify({
        name,
        version,
        defaultPlatformPackages,
      }),
      "node_modules/@callstack/react-native-visionos/package.json":
        JSON.stringify({
          name: "@callstack/react-native-visionos",
          version: "1000.0.0",
        }),
      "node_modules/react-native/package.json": JSON.stringify({
        name: "react-native",
        version: "1000.0.0",
      }),
      "node_modules/react-native-macos/package.json": JSON.stringify({
        name: "react-native-macos",
        version: "1000.0.0",
      }),
    };
  }

  function trimPath(path: string, trim: string) {
    return path?.replace(trim, "/~");
  }

  function trimPaths(
    project: ProjectConfiguration,
    trim: string
  ): ProjectConfiguration {
    const searchPaths = project.buildSettings[USER_HEADER_SEARCH_PATHS];
    if (!Array.isArray(searchPaths)) {
      fail("'USER_HEADER_SEARCH_PATHS' should have been set");
    }

    for (let i = 0; i < searchPaths.length; ++i) {
      searchPaths[i] = trimPath(searchPaths[i], trim);
    }

    project.reactNativePath = trimPath(project.reactNativePath, trim);
    project.xcodeprojPath = trimPath(project.xcodeprojPath, trim);

    return project;
  }

  before(() => {
    setMockFiles();
  });

  afterEach(() => {
    setMockFiles();
  });

  it("throws on unsupported platforms", () => {
    throws(
      () => generateProject("", "android" as unknown as "ios", {}),
      new Error("Unsupported platform: android")
    );
    throws(
      () => generateProject("", "windows" as unknown as "ios", {}),
      new Error("Unsupported platform: windows")
    );
  });

  it("throws when 'node_modules' cannot be found", () => {
    setMockFiles({ "app.json": "{}" });

    throws(
      () => generateProject("", "ios", {}),
      new Error("Cannot not find 'node_modules' folder")
    );
  });

  for (const platform of ["ios", "macos", "visionos"] as const) {
    it(`[${platform}] generates Xcode project files for old architecture`, () => {
      setMockFiles(makeMockProject());

      const result = generateProject(platform, platform, {});

      const cwd = process.cwd();
      const cwdLength = cwd.length;
      const files = Object.keys(toJSON()).map((path) =>
        path.substring(cwdLength)
      );

      const expected = PROJECT_FILES.oldArch[platform];

      deepEqual(files, expected.files);
      deepEqual(trimPaths(result, cwd), expected.result);
    });

    it(`[${platform}] generates Xcode project files for new architecture`, () => {
      setMockFiles(makeMockProject());

      const result = generateProject(platform, platform, {
        fabricEnabled: true,
      });

      const cwd = process.cwd();
      const cwdLength = cwd.length;
      const files = Object.keys(toJSON()).map((path) =>
        path.substring(cwdLength)
      );

      const expected = PROJECT_FILES.newArch[platform];

      deepEqual(files, expected.files);
      deepEqual(trimPaths(result, cwd), expected.result);
    });

    it(`[${platform}] exports path to Node binary`, () => {
      setMockFiles(makeMockProject());

      generateProject(platform, platform, { fabricEnabled: true });
      const xcode_env = readTextFile(`${platform}/.xcode.env`, mockfs);
      const xcode_m = xcode_env.match(/export NODE_BINARY='(.*?)'/);

      ok(xcode_m);
      ok(xcode_m[1].startsWith("/"));
      ok(fs.existsSync(xcode_m[1]));

      const env = readTextFile(
        `node_modules/.generated/${platform}/.env`,
        mockfs
      );
      const env_m = env.match(/export PATH='(.*?)':\$PATH/);

      ok(env_m);
      ok(env_m[1].startsWith("/"));
      ok(fs.existsSync(env_m[1]));
    });

    it(`[${platform}] applies build setting overrides`, () => {
      setMockFiles(makeMockProject());

      const result = generateProject(platform, platform, {
        buildSettingOverrides: {
          ONLY_ACTIVE_ARCH: "NO",
        },
      });

      equal(result.buildSettings.ONLY_ACTIVE_ARCH, "NO");
    });

    it(`[${platform}] returns single app property`, () => {
      setMockFiles(makeMockProject({ singleApp: "Main" }));

      const result = generateProject(platform, platform, {});

      equal(result.singleApp, "Main");
    });
  }

  it("uses custom React Native path", () => {
    setMockFiles(
      makeMockProject({
        ios: { reactNativePath: "node_modules/react-native-macos" },
      })
    );

    const result = generateProject("ios", "ios", { fabricEnabled: true });
    const cwd = process.cwd();

    deepEqual(trimPaths(result, cwd), PROJECT_FILES.customReactNative);
  });
});

const PROJECT_FILES = {
  customReactNative: {
    buildSettings: {
      GCC_PREPROCESSOR_DEFINITIONS: [
        "REACT_NATIVE_VERSION=1000000000",
        "FOLLY_NO_CONFIG=1",
        "RCT_NEW_ARCH_ENABLED=1",
        "USE_FABRIC=1",
        "USE_BRIDGELESS=1",
      ],
      OTHER_SWIFT_FLAGS: ["-DUSE_FABRIC", "-DUSE_BRIDGELESS"],
      PRODUCT_BUILD_NUMBER: "1",
      PRODUCT_DISPLAY_NAME: "ContosoApp",
      PRODUCT_VERSION: "1.0",
      USER_HEADER_SEARCH_PATHS: ["/~/node_modules/.generated"],
    },
    reactNativePath: "/~/node_modules/react-native-macos",
    reactNativeVersion: 1000000000,
    testsBuildSettings: {},
    uitestsBuildSettings: {},
    useBridgeless: true,
    useNewArch: true,
    xcodeprojPath: "/~/node_modules/.generated/ios/ReactTestApp.xcodeproj",
  },
  newArch: {
    ios: {
      result: {
        buildSettings: {
          GCC_PREPROCESSOR_DEFINITIONS: [
            "REACT_NATIVE_VERSION=1000000000",
            "FOLLY_NO_CONFIG=1",
            "RCT_NEW_ARCH_ENABLED=1",
            "USE_FABRIC=1",
            "USE_BRIDGELESS=1",
          ],
          OTHER_SWIFT_FLAGS: ["-DUSE_FABRIC", "-DUSE_BRIDGELESS"],
          PRODUCT_BUILD_NUMBER: "1",
          PRODUCT_DISPLAY_NAME: "ContosoApp",
          PRODUCT_VERSION: "1.0",
          USER_HEADER_SEARCH_PATHS: ["/~/node_modules/.generated"],
        },
        reactNativePath: "/~/node_modules/react-native",
        reactNativeVersion: 1000000000,
        testsBuildSettings: {},
        uitestsBuildSettings: {},
        useBridgeless: true,
        useNewArch: true,
        xcodeprojPath: "/~/node_modules/.generated/ios/ReactTestApp.xcodeproj",
      },
      files: [
        "/app.json",
        "/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/ios/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/ios/ReactTestApp/Assets.xcassets/Contents.json",
        "/ios/ReactTestApp/Info.plist",
        "/ios/ReactTestAppTests/Info.plist",
        "/ios/ReactTestAppUITests/Info.plist",
        "/ios/.xcode.env",
        "/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/macos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/macos/ReactTestApp/Assets.xcassets/Contents.json",
        "/macos/ReactTestApp/Info.plist",
        "/macos/ReactTestAppTests/Info.plist",
        "/macos/ReactTestAppUITests/Info.plist",
        "/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/visionos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/visionos/ReactTestApp/Assets.xcassets/Contents.json",
        "/visionos/ReactTestApp/Info.plist",
        "/visionos/ReactTestAppTests/Info.plist",
        "/visionos/ReactTestAppUITests/Info.plist",
        "/package.json",
        "/node_modules/@callstack/react-native-visionos/package.json",
        "/node_modules/react-native/package.json",
        "/node_modules/react-native-macos/package.json",
        "/node_modules/.generated/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/node_modules/.generated/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ContosoApp.xcscheme",
        "/node_modules/.generated/ios/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/node_modules/.generated/ios/Assets.xcassets/Contents.json",
        "/node_modules/.generated/ios/App.entitlements",
        "/node_modules/.generated/ios/Info.plist",
        "/node_modules/.generated/ios/PrivacyInfo.xcprivacy",
        "/node_modules/.generated/ios/.env",
      ],
    },
    macos: {
      result: {
        buildSettings: {
          GCC_PREPROCESSOR_DEFINITIONS: [
            "REACT_NATIVE_VERSION=1000000000",
            "FOLLY_NO_CONFIG=1",
            "RCT_NEW_ARCH_ENABLED=1",
            "USE_FABRIC=1",
            "USE_BRIDGELESS=1",
          ],
          OTHER_SWIFT_FLAGS: ["-DUSE_FABRIC", "-DUSE_BRIDGELESS"],
          PRODUCT_BUILD_NUMBER: "1",
          PRODUCT_DISPLAY_NAME: "ContosoApp",
          PRODUCT_VERSION: "1.0",
          USER_HEADER_SEARCH_PATHS: ["/~/node_modules/.generated"],
        },
        reactNativePath: "/~/node_modules/react-native-macos",
        reactNativeVersion: 1000000000,
        testsBuildSettings: {},
        uitestsBuildSettings: {},
        useBridgeless: true,
        useNewArch: true,
        xcodeprojPath:
          "/~/node_modules/.generated/macos/ReactTestApp.xcodeproj",
      },
      files: [
        "/app.json",
        "/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/ios/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/ios/ReactTestApp/Assets.xcassets/Contents.json",
        "/ios/ReactTestApp/Info.plist",
        "/ios/ReactTestAppTests/Info.plist",
        "/ios/ReactTestAppUITests/Info.plist",
        "/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/macos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/macos/ReactTestApp/Assets.xcassets/Contents.json",
        "/macos/ReactTestApp/Info.plist",
        "/macos/ReactTestAppTests/Info.plist",
        "/macos/ReactTestAppUITests/Info.plist",
        "/macos/.xcode.env",
        "/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/visionos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/visionos/ReactTestApp/Assets.xcassets/Contents.json",
        "/visionos/ReactTestApp/Info.plist",
        "/visionos/ReactTestAppTests/Info.plist",
        "/visionos/ReactTestAppUITests/Info.plist",
        "/package.json",
        "/node_modules/@callstack/react-native-visionos/package.json",
        "/node_modules/react-native/package.json",
        "/node_modules/react-native-macos/package.json",
        "/node_modules/.generated/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/node_modules/.generated/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ContosoApp.xcscheme",
        "/node_modules/.generated/macos/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/node_modules/.generated/macos/Assets.xcassets/Contents.json",
        "/node_modules/.generated/macos/App.entitlements",
        "/node_modules/.generated/macos/Info.plist",
        "/node_modules/.generated/macos/PrivacyInfo.xcprivacy",
        "/node_modules/.generated/macos/.env",
      ],
    },
    visionos: {
      result: {
        buildSettings: {
          GCC_PREPROCESSOR_DEFINITIONS: [
            "REACT_NATIVE_VERSION=1000000000",
            "FOLLY_NO_CONFIG=1",
            "RCT_NEW_ARCH_ENABLED=1",
            "USE_FABRIC=1",
            "USE_BRIDGELESS=1",
          ],
          OTHER_SWIFT_FLAGS: ["-DUSE_FABRIC", "-DUSE_BRIDGELESS"],
          PRODUCT_BUILD_NUMBER: "1",
          PRODUCT_DISPLAY_NAME: "ContosoApp",
          PRODUCT_VERSION: "1.0",
          USER_HEADER_SEARCH_PATHS: ["/~/node_modules/.generated"],
        },
        reactNativePath: "/~/node_modules/@callstack/react-native-visionos",
        reactNativeVersion: 1000000000,
        testsBuildSettings: {},
        uitestsBuildSettings: {},
        useBridgeless: true,
        useNewArch: true,
        xcodeprojPath:
          "/~/node_modules/.generated/visionos/ReactTestApp.xcodeproj",
      },
      files: [
        "/app.json",
        "/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/ios/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/ios/ReactTestApp/Assets.xcassets/Contents.json",
        "/ios/ReactTestApp/Info.plist",
        "/ios/ReactTestAppTests/Info.plist",
        "/ios/ReactTestAppUITests/Info.plist",
        "/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/macos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/macos/ReactTestApp/Assets.xcassets/Contents.json",
        "/macos/ReactTestApp/Info.plist",
        "/macos/ReactTestAppTests/Info.plist",
        "/macos/ReactTestAppUITests/Info.plist",
        "/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/visionos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/visionos/ReactTestApp/Assets.xcassets/Contents.json",
        "/visionos/ReactTestApp/Info.plist",
        "/visionos/ReactTestAppTests/Info.plist",
        "/visionos/ReactTestAppUITests/Info.plist",
        "/visionos/.xcode.env",
        "/package.json",
        "/node_modules/@callstack/react-native-visionos/package.json",
        "/node_modules/react-native/package.json",
        "/node_modules/react-native-macos/package.json",
        "/node_modules/.generated/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/node_modules/.generated/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ContosoApp.xcscheme",
        "/node_modules/.generated/visionos/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/node_modules/.generated/visionos/Assets.xcassets/Contents.json",
        "/node_modules/.generated/visionos/App.entitlements",
        "/node_modules/.generated/visionos/Info.plist",
        "/node_modules/.generated/visionos/PrivacyInfo.xcprivacy",
        "/node_modules/.generated/visionos/.env",
      ],
    },
  },
  oldArch: {
    ios: {
      result: {
        buildSettings: {
          GCC_PREPROCESSOR_DEFINITIONS: ["REACT_NATIVE_VERSION=1000000000"],
          OTHER_SWIFT_FLAGS: [],
          PRODUCT_BUILD_NUMBER: "1",
          PRODUCT_DISPLAY_NAME: "ContosoApp",
          PRODUCT_VERSION: "1.0",
          USER_HEADER_SEARCH_PATHS: ["/~/node_modules/.generated"],
        },
        reactNativePath: "/~/node_modules/react-native",
        reactNativeVersion: 1000000000,
        testsBuildSettings: {},
        uitestsBuildSettings: {},
        useBridgeless: false,
        useNewArch: false,
        xcodeprojPath: "/~/node_modules/.generated/ios/ReactTestApp.xcodeproj",
      },
      files: [
        "/app.json",
        "/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/ios/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/ios/ReactTestApp/Assets.xcassets/Contents.json",
        "/ios/ReactTestApp/Info.plist",
        "/ios/ReactTestAppTests/Info.plist",
        "/ios/ReactTestAppUITests/Info.plist",
        "/ios/.xcode.env",
        "/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/macos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/macos/ReactTestApp/Assets.xcassets/Contents.json",
        "/macos/ReactTestApp/Info.plist",
        "/macos/ReactTestAppTests/Info.plist",
        "/macos/ReactTestAppUITests/Info.plist",
        "/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/visionos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/visionos/ReactTestApp/Assets.xcassets/Contents.json",
        "/visionos/ReactTestApp/Info.plist",
        "/visionos/ReactTestAppTests/Info.plist",
        "/visionos/ReactTestAppUITests/Info.plist",
        "/package.json",
        "/node_modules/@callstack/react-native-visionos/package.json",
        "/node_modules/react-native/package.json",
        "/node_modules/react-native-macos/package.json",
        "/node_modules/.generated/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/node_modules/.generated/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ContosoApp.xcscheme",
        "/node_modules/.generated/ios/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/node_modules/.generated/ios/Assets.xcassets/Contents.json",
        "/node_modules/.generated/ios/App.entitlements",
        "/node_modules/.generated/ios/Info.plist",
        "/node_modules/.generated/ios/PrivacyInfo.xcprivacy",
        "/node_modules/.generated/ios/.env",
      ],
    },
    macos: {
      result: {
        buildSettings: {
          GCC_PREPROCESSOR_DEFINITIONS: ["REACT_NATIVE_VERSION=1000000000"],
          OTHER_SWIFT_FLAGS: [],
          PRODUCT_BUILD_NUMBER: "1",
          PRODUCT_DISPLAY_NAME: "ContosoApp",
          PRODUCT_VERSION: "1.0",
          USER_HEADER_SEARCH_PATHS: ["/~/node_modules/.generated"],
        },
        reactNativePath: "/~/node_modules/react-native-macos",
        reactNativeVersion: 1000000000,
        testsBuildSettings: {},
        uitestsBuildSettings: {},
        useBridgeless: false,
        useNewArch: false,
        xcodeprojPath:
          "/~/node_modules/.generated/macos/ReactTestApp.xcodeproj",
      },
      files: [
        "/app.json",
        "/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/ios/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/ios/ReactTestApp/Assets.xcassets/Contents.json",
        "/ios/ReactTestApp/Info.plist",
        "/ios/ReactTestAppTests/Info.plist",
        "/ios/ReactTestAppUITests/Info.plist",
        "/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/macos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/macos/ReactTestApp/Assets.xcassets/Contents.json",
        "/macos/ReactTestApp/Info.plist",
        "/macos/ReactTestAppTests/Info.plist",
        "/macos/ReactTestAppUITests/Info.plist",
        "/macos/.xcode.env",
        "/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/visionos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/visionos/ReactTestApp/Assets.xcassets/Contents.json",
        "/visionos/ReactTestApp/Info.plist",
        "/visionos/ReactTestAppTests/Info.plist",
        "/visionos/ReactTestAppUITests/Info.plist",
        "/package.json",
        "/node_modules/@callstack/react-native-visionos/package.json",
        "/node_modules/react-native/package.json",
        "/node_modules/react-native-macos/package.json",
        "/node_modules/.generated/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/node_modules/.generated/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ContosoApp.xcscheme",
        "/node_modules/.generated/macos/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/node_modules/.generated/macos/Assets.xcassets/Contents.json",
        "/node_modules/.generated/macos/App.entitlements",
        "/node_modules/.generated/macos/Info.plist",
        "/node_modules/.generated/macos/PrivacyInfo.xcprivacy",
        "/node_modules/.generated/macos/.env",
      ],
    },
    visionos: {
      result: {
        buildSettings: {
          GCC_PREPROCESSOR_DEFINITIONS: ["REACT_NATIVE_VERSION=1000000000"],
          OTHER_SWIFT_FLAGS: [],
          PRODUCT_BUILD_NUMBER: "1",
          PRODUCT_DISPLAY_NAME: "ContosoApp",
          PRODUCT_VERSION: "1.0",
          USER_HEADER_SEARCH_PATHS: ["/~/node_modules/.generated"],
        },
        reactNativePath: "/~/node_modules/@callstack/react-native-visionos",
        reactNativeVersion: 1000000000,
        testsBuildSettings: {},
        uitestsBuildSettings: {},
        useBridgeless: false,
        useNewArch: false,
        xcodeprojPath:
          "/~/node_modules/.generated/visionos/ReactTestApp.xcodeproj",
      },
      files: [
        "/app.json",
        "/ios/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/ios/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/ios/ReactTestApp/Assets.xcassets/Contents.json",
        "/ios/ReactTestApp/Info.plist",
        "/ios/ReactTestAppTests/Info.plist",
        "/ios/ReactTestAppUITests/Info.plist",
        "/macos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/macos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/macos/ReactTestApp/Assets.xcassets/Contents.json",
        "/macos/ReactTestApp/Info.plist",
        "/macos/ReactTestAppTests/Info.plist",
        "/macos/ReactTestAppUITests/Info.plist",
        "/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/visionos/ReactTestApp/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/visionos/ReactTestApp/Assets.xcassets/Contents.json",
        "/visionos/ReactTestApp/Info.plist",
        "/visionos/ReactTestAppTests/Info.plist",
        "/visionos/ReactTestAppUITests/Info.plist",
        "/visionos/.xcode.env",
        "/package.json",
        "/node_modules/@callstack/react-native-visionos/package.json",
        "/node_modules/react-native/package.json",
        "/node_modules/react-native-macos/package.json",
        "/node_modules/.generated/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ReactTestApp.xcscheme",
        "/node_modules/.generated/visionos/ReactTestApp.xcodeproj/xcshareddata/xcschemes/ContosoApp.xcscheme",
        "/node_modules/.generated/visionos/Assets.xcassets/AppIcon.iconset/Contents.json",
        "/node_modules/.generated/visionos/Assets.xcassets/Contents.json",
        "/node_modules/.generated/visionos/App.entitlements",
        "/node_modules/.generated/visionos/Info.plist",
        "/node_modules/.generated/visionos/PrivacyInfo.xcprivacy",
        "/node_modules/.generated/visionos/.env",
      ],
    },
  },
};
