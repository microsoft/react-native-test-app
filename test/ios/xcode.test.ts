import {
  deepEqual,
  equal,
  match,
  notEqual,
  ok,
  throws,
} from "node:assert/strict";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { isObject, jsonFromPlist } from "../../ios/utils.mjs";
import {
  applyBuildSettings as applyBuildSettingsActual,
  applyPreprocessorDefinitions,
  applySwiftFlags,
  applyUserHeaderSearchPaths,
  CODE_SIGN_ENTITLEMENTS,
  CODE_SIGN_IDENTITY,
  configureBuildSchemes as configureBuildSchemesActual,
  DEVELOPMENT_TEAM,
  GCC_PREPROCESSOR_DEFINITIONS,
  OTHER_SWIFT_FLAGS,
  overrideBuildSettings,
  PRODUCT_BUILD_NUMBER,
  PRODUCT_BUNDLE_IDENTIFIER,
  USER_HEADER_SEARCH_PATHS,
} from "../../ios/xcode.mjs";
import { readTextFile, v } from "../../scripts/helpers.js";
import type {
  ApplePlatform,
  JSONObject,
  JSONValue,
  ProjectConfiguration,
} from "../../scripts/types.ts";
import { fs, setMockFiles, toJSON } from "../fs.mock.ts";

const macosOnly = { skip: process.platform === "win32" };

function makeProjectConfiguration(): ProjectConfiguration {
  return {
    xcodeprojPath: "",
    reactNativePath: "",
    reactNativeVersion: 0,
    reactNativeHostPath: "",
    useNewArch: false,
    useBridgeless: false,
    buildSettings: {},
    testsBuildSettings: {},
    uitestsBuildSettings: {},
  };
}

describe("applyBuildSettings()", macosOnly, () => {
  function applyBuildSettings(
    config: JSONValue,
    project: ProjectConfiguration,
    projectRoot: string,
    destination: string
  ): ProjectConfiguration {
    return applyBuildSettingsActual(
      config,
      project,
      projectRoot,
      destination,
      fs
    );
  }

  afterEach(() => {
    setMockFiles();
  });

  it("sets default build settings", () => {
    const project = makeProjectConfiguration();
    applyBuildSettings(null, project, ".", ".");

    deepEqual(project.buildSettings, { PRODUCT_BUILD_NUMBER: "1" });
    deepEqual(project.testsBuildSettings, {});
    deepEqual(project.uitestsBuildSettings, {});
  });

  it("sets codesign entitlements", () => {
    const project = makeProjectConfiguration();
    applyBuildSettings({}, project, ".", ".");

    equal(project.buildSettings[CODE_SIGN_ENTITLEMENTS], undefined);

    applyBuildSettings({ codeSignEntitlements: {} }, project, ".", ".");

    equal(project.buildSettings[CODE_SIGN_ENTITLEMENTS], undefined);

    const codeSignEntitlements = "App.entitlements";
    const config = { codeSignEntitlements };

    throws(() => applyBuildSettings(config, project, ".", "."));

    setMockFiles({ "app.json": "" });
    applyBuildSettings(config, project, ".", ".");

    equal(project.buildSettings[CODE_SIGN_ENTITLEMENTS], codeSignEntitlements);
  });

  it("sets codesign identity", () => {
    const project = makeProjectConfiguration();
    applyBuildSettings({}, project, ".", ".");

    equal(project.buildSettings[CODE_SIGN_IDENTITY], undefined);

    applyBuildSettings({ codeSignIdentity: true }, project, ".", ".");

    equal(project.buildSettings[CODE_SIGN_IDENTITY], undefined);

    const codeSignIdentity = "-";
    applyBuildSettings({ codeSignIdentity }, project, ".", ".");

    equal(project.buildSettings[CODE_SIGN_IDENTITY], codeSignIdentity);
  });

  it("sets development team", () => {
    const project = makeProjectConfiguration();
    applyBuildSettings({}, project, ".", ".");

    equal(project.buildSettings[DEVELOPMENT_TEAM], undefined);
    equal(project.testsBuildSettings[DEVELOPMENT_TEAM], undefined);
    equal(project.uitestsBuildSettings[DEVELOPMENT_TEAM], undefined);

    applyBuildSettings({ developmentTeam: true }, project, ".", ".");

    equal(project.buildSettings[DEVELOPMENT_TEAM], undefined);
    equal(project.testsBuildSettings[DEVELOPMENT_TEAM], undefined);
    equal(project.uitestsBuildSettings[DEVELOPMENT_TEAM], undefined);

    const developmentTeam = "Contoso";
    applyBuildSettings({ developmentTeam }, project, ".", ".");

    equal(project.buildSettings[DEVELOPMENT_TEAM], developmentTeam);
    equal(project.testsBuildSettings[DEVELOPMENT_TEAM], developmentTeam);
    equal(project.uitestsBuildSettings[DEVELOPMENT_TEAM], developmentTeam);
  });

  it("sets bundle identifier", () => {
    const project = makeProjectConfiguration();
    applyBuildSettings({}, project, ".", ".");

    equal(project.buildSettings[PRODUCT_BUNDLE_IDENTIFIER], undefined);
    equal(project.testsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER], undefined);
    equal(project.uitestsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER], undefined);

    applyBuildSettings({ bundleIdentifier: true }, project, ".", ".");

    equal(project.buildSettings[PRODUCT_BUNDLE_IDENTIFIER], undefined);
    equal(project.testsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER], undefined);
    equal(project.uitestsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER], undefined);

    const bundleIdentifier = "com.contoso.ReactApp";
    applyBuildSettings({ bundleIdentifier }, project, ".", ".");

    equal(project.buildSettings[PRODUCT_BUNDLE_IDENTIFIER], bundleIdentifier);
    equal(
      project.testsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER],
      bundleIdentifier + "Tests"
    );
    equal(
      project.uitestsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER],
      bundleIdentifier + "UITests"
    );
  });

  it("sets build number", () => {
    const project = makeProjectConfiguration();
    applyBuildSettings({}, project, ".", ".");

    equal(project.buildSettings[PRODUCT_BUILD_NUMBER], "1");

    applyBuildSettings({ buildNumber: "" }, project, ".", ".");

    equal(project.buildSettings[PRODUCT_BUILD_NUMBER], "1");

    applyBuildSettings({ buildNumber: "9769" }, project, ".", ".");

    equal(project.buildSettings[PRODUCT_BUILD_NUMBER], "9769");
  });
});

describe("applyPreprocessorDefinitions()", () => {
  it("sets `REACT_NATIVE_VERSION`", () => {
    const project = makeProjectConfiguration();
    const { buildSettings } = project;

    applyPreprocessorDefinitions(project);

    deepEqual(buildSettings[GCC_PREPROCESSOR_DEFINITIONS], [
      "REACT_NATIVE_VERSION=0",
    ]);
  });

  it("appends preprocessor definitions", () => {
    const project = makeProjectConfiguration();
    const { buildSettings } = project;
    buildSettings[GCC_PREPROCESSOR_DEFINITIONS] = ["TEST=1"];

    applyPreprocessorDefinitions(project);

    deepEqual(buildSettings[GCC_PREPROCESSOR_DEFINITIONS], [
      "TEST=1",
      "REACT_NATIVE_VERSION=0",
    ]);
  });

  it("appends New Arch specific preprocessors", () => {
    const project = makeProjectConfiguration();
    project.useNewArch = true;
    applyPreprocessorDefinitions(project);

    deepEqual(project.buildSettings[GCC_PREPROCESSOR_DEFINITIONS], [
      "REACT_NATIVE_VERSION=0",
      "FOLLY_NO_CONFIG=1",
      "RCT_NEW_ARCH_ENABLED=1",
      "USE_FABRIC=1",
    ]);
  });

  it("appends bridgeless specific preprocessors", () => {
    const project = makeProjectConfiguration();
    project.useNewArch = true;
    project.useBridgeless = true;
    applyPreprocessorDefinitions(project);

    deepEqual(project.buildSettings[GCC_PREPROCESSOR_DEFINITIONS], [
      "REACT_NATIVE_VERSION=0",
      "FOLLY_NO_CONFIG=1",
      "RCT_NEW_ARCH_ENABLED=1",
      "USE_FABRIC=1",
      "USE_BRIDGELESS=1",
    ]);
  });

  it("does not append bridgeless specific preprocessors if New Arch is disabled", () => {
    const project = makeProjectConfiguration();
    project.useNewArch = false;
    project.useBridgeless = true;
    applyPreprocessorDefinitions(project);

    deepEqual(project.buildSettings[GCC_PREPROCESSOR_DEFINITIONS], [
      "REACT_NATIVE_VERSION=0",
    ]);
  });

  it("applies C++17 workarounds for unpatched versions", () => {
    const versions = [
      [v(0, 71, 0), true],
      [v(0, 71, 3), true],
      [v(0, 71, 4), false],
      [v(0, 72, 0), true],
      [v(0, 72, 4), true],
      [v(0, 72, 5), false],
    ] as const;

    for (const [version, enable] of versions) {
      const project = makeProjectConfiguration();
      const { buildSettings } = project;

      project.reactNativeVersion = version;
      applyPreprocessorDefinitions(project);

      const expected = [`REACT_NATIVE_VERSION=${version}`];
      if (enable) {
        expected.push("_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION=1");
      }

      deepEqual(buildSettings[GCC_PREPROCESSOR_DEFINITIONS], expected);
    }
  });
});

describe("applySwiftFlags()", () => {
  it("appends compiler flags", () => {
    const project = makeProjectConfiguration();
    applySwiftFlags(project);

    deepEqual(project.buildSettings[OTHER_SWIFT_FLAGS], []);

    const flags = ["-Wall"];
    project.buildSettings[OTHER_SWIFT_FLAGS] = flags;

    applySwiftFlags(project);

    deepEqual(project.buildSettings[OTHER_SWIFT_FLAGS], flags);
  });

  it("appends New Arch specific flags", () => {
    const project = makeProjectConfiguration();
    project.useNewArch = true;

    applySwiftFlags(project);

    deepEqual(project.buildSettings[OTHER_SWIFT_FLAGS], ["-DUSE_FABRIC"]);
  });

  it("appends bridgeless specific flags", () => {
    const project = makeProjectConfiguration();
    project.useNewArch = true;
    project.useBridgeless = true;

    applySwiftFlags(project);

    deepEqual(project.buildSettings[OTHER_SWIFT_FLAGS], [
      "-DUSE_FABRIC",
      "-DUSE_BRIDGELESS",
    ]);
  });

  it("does not append bridgeless specific flags if New Arch is disabled", () => {
    const project = makeProjectConfiguration();
    project.useBridgeless = true;

    applySwiftFlags(project);

    deepEqual(project.buildSettings[OTHER_SWIFT_FLAGS], []);
  });

  it("appends single app flags", () => {
    const project = makeProjectConfiguration();
    project.singleApp = "";

    applySwiftFlags(project);

    deepEqual(project.buildSettings[OTHER_SWIFT_FLAGS], []);

    project.singleApp = "ContosoApp";

    applySwiftFlags(project);

    deepEqual(project.buildSettings[OTHER_SWIFT_FLAGS], [
      "-DENABLE_SINGLE_APP_MODE",
    ]);
  });
});

describe("applyUserHeaderSearchPaths()", () => {
  const cwd = process.cwd();

  it("sets user header search paths", () => {
    const project = makeProjectConfiguration();

    applyUserHeaderSearchPaths(project, "ReactApp");

    deepEqual(project.buildSettings[USER_HEADER_SEARCH_PATHS], [cwd]);
  });

  it("appends user header search paths", () => {
    const project = makeProjectConfiguration();
    project.buildSettings[USER_HEADER_SEARCH_PATHS] = ["Test"];

    applyUserHeaderSearchPaths(project, "ReactApp");

    deepEqual(project.buildSettings[USER_HEADER_SEARCH_PATHS], ["Test", cwd]);
  });
});

describe("configureBuildSchemes()", macosOnly, () => {
  const projectRoot = ".";
  const xcschemesDir = path.join(projectRoot, "xcshareddata", "xcschemes");

  const defaultSchemePath = path.join(xcschemesDir, "ReactTestApp.xcscheme");
  const defaultScheme = `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1320" version="1.3">
   <BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"></BuildAction>
   <TestAction buildConfiguration="Debug"></TestAction>
   <LaunchAction buildConfiguration="Debug"></LaunchAction>
   <ProfileAction buildConfiguration="Release"></ProfileAction>
   <AnalyzeAction buildConfiguration="Debug"></AnalyzeAction>
   <ArchiveAction buildConfiguration="Release"></ArchiveAction>
</Scheme>
`;

  function configureBuildSchemes(
    config: JSONObject,
    targetPlatform: ApplePlatform,
    xcodeproj: string
  ) {
    return configureBuildSchemesActual(config, targetPlatform, xcodeproj, fs);
  }

  beforeEach(() => {
    setMockFiles({ [defaultSchemePath]: defaultScheme });
  });

  afterEach(() => {
    setMockFiles();
  });

  it("does not write `.xcscheme` files unnecessarily", () => {
    configureBuildSchemes({}, "ios", projectRoot);

    const vol = Object.entries(toJSON());

    equal(vol.length, 1);
    match(vol[0][0], new RegExp(defaultSchemePath + "$"));
    equal(vol[0][1], defaultScheme);
  });

  it("copies default `.xcscheme` if app is named", () => {
    configureBuildSchemes({ name: "Test" }, "ios", projectRoot);

    const vol = Object.entries(toJSON());

    equal(vol.length, 2);
    match(vol[0][0], new RegExp(`${defaultSchemePath}$`));
    equal(vol[0][1], defaultScheme);

    const xcschemeCopy = path.join(xcschemesDir, "Test.xcscheme");

    match(vol[1][0], new RegExp(xcschemeCopy + "$"));
    equal(vol[1][1], defaultScheme);
  });

  it("disables Metal API validation", () => {
    const appConfig = { ios: { metalAPIValidation: false } };
    configureBuildSchemes(appConfig, "ios", projectRoot);

    const output = readTextFile(defaultSchemePath, fs);

    notEqual(output, defaultScheme);
    match(
      output,
      /<LaunchAction buildConfiguration="Debug" enableGPUValidationMode="1"><\/LaunchAction>/
    );
  });
});

describe("overrideBuildSettings()", () => {
  it("overrides build settings", () => {
    const buildSettings: JSONObject = {
      OTHER_LDFLAGS: '-l"Pods-TestApp"',
      ONLY_ACTIVE_ARCH: "NO",
    };

    overrideBuildSettings(buildSettings, {});

    equal(buildSettings["OTHER_LDFLAGS"], '-l"Pods-TestApp"');

    overrideBuildSettings(buildSettings, { OTHER_LDFLAGS: "-ObjC" });

    equal(buildSettings["OTHER_LDFLAGS"], "-ObjC");

    // Test passing an array
    const settingsWithArray = {
      OTHER_LDFLAGS: ["$(inherited)", '-l"Pods-TestApp"'],
    };

    overrideBuildSettings(settingsWithArray, { OTHER_LDFLAGS: ["-ObjC"] });

    deepEqual(settingsWithArray["OTHER_LDFLAGS"], ["-ObjC"]);

    // Test setting a new key
    overrideBuildSettings(buildSettings, { OTHER_CFLAGS: "-DDEBUG" });

    equal(buildSettings["OTHER_CFLAGS"], "-DDEBUG");

    overrideBuildSettings(buildSettings, { ONLY_ACTIVE_ARCH: "YES" });

    equal(buildSettings["ONLY_ACTIVE_ARCH"], "YES");
  });
});

describe("macos/ReactTestApp.xcodeproj", macosOnly, () => {
  // Xcode expects the development team used for code signing to exist when
  // targeting macOS. Unlike when targeting iOS, the warnings are treated as
  // errors.
  it("does not specify development team", () => {
    const xcodeproj = jsonFromPlist(
      fileURLToPath(
        new URL(
          "../../macos/ReactTestApp.xcodeproj/project.pbxproj",
          import.meta.url
        )
      )
    );

    const { objects } = xcodeproj;

    ok(isObject(objects));
    ok(typeof xcodeproj.rootObject === "string");

    const rootObject = objects[xcodeproj.rootObject];

    ok(isObject(rootObject));
    ok(Array.isArray(rootObject.targets));
    ok(typeof rootObject.targets[0] === "string");

    const appTarget = objects[rootObject.targets[0]];

    ok(isObject(appTarget));
    equal(appTarget.name, "ReactTestApp");
    ok(typeof appTarget.buildConfigurationList === "string");

    const buildConfigurationList = objects[appTarget.buildConfigurationList];

    ok(isObject(buildConfigurationList));
    ok(Array.isArray(buildConfigurationList.buildConfigurations));

    for (const config of buildConfigurationList.buildConfigurations) {
      ok(typeof config === "string");

      const buildConfiguration: JSONValue = objects[config];

      ok(isObject(buildConfiguration));
      ok(isObject(buildConfiguration.buildSettings));
      equal(buildConfiguration.buildSettings[CODE_SIGN_IDENTITY], "-");
      equal(buildConfiguration.buildSettings[DEVELOPMENT_TEAM], undefined);
    }
  });
});
