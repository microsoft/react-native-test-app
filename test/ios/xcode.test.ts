import { deepEqual, equal, match, notEqual } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  configureXcodeSchemes as configureXcodeSchemesActual,
  overrideBuildSettings,
} from "../../ios/xcode.mjs";
import type { JSONObject } from "../../scripts/types.ts";
import { fs, setMockFiles, toJSON } from "../fs.mock.ts";

const macosOnly = { skip: process.platform === "win32" };

describe("configureXcodeSchemes()", macosOnly, () => {
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

  const configureXcodeSchemes: typeof configureXcodeSchemesActual = (
    appConfig,
    targetPlatform,
    xcodeproj
  ) => configureXcodeSchemesActual(appConfig, targetPlatform, xcodeproj, fs);

  afterEach(() => {
    setMockFiles();
  });

  it("does not write `.xcscheme` files unnecessarily", () => {
    setMockFiles({ [defaultSchemePath]: defaultScheme });

    configureXcodeSchemes({}, "ios", projectRoot);

    const vol = Object.entries(toJSON());

    equal(vol.length, 1);
    match(vol[0][0], new RegExp(defaultSchemePath + "$"));
    equal(vol[0][1], defaultScheme);
  });

  it("copies default `.xcscheme` if app is named", () => {
    setMockFiles({ [defaultSchemePath]: defaultScheme });

    configureXcodeSchemes({ name: "Test" }, "ios", projectRoot);

    const vol = Object.entries(toJSON());

    equal(vol.length, 2);
    match(vol[0][0], new RegExp(`${defaultSchemePath}$`));
    equal(vol[0][1], defaultScheme);

    const xcschemeCopy = path.join(xcschemesDir, "Test.xcscheme");

    match(vol[1][0], new RegExp(xcschemeCopy + "$"));
    equal(vol[1][1], defaultScheme);
  });

  it("disables Metal API validation", () => {
    setMockFiles({ [defaultSchemePath]: defaultScheme });

    const appConfig = { ios: { metalAPIValidation: false } };
    configureXcodeSchemes(appConfig, "ios", projectRoot);

    const output = fs.readFileSync(defaultSchemePath, { encoding: "utf-8" });

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
