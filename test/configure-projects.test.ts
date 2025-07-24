import { deepEqual, equal, fail, ok, throws } from "node:assert/strict";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  configureProjects,
  internalForTestingPurposesOnly,
} from "../scripts/configure-projects.js";

// This value needs to be the same as `package` in
// `android/app/src/main/AndroidManifest.xml`
const packageName = "com.microsoft.reacttestapp";

describe("configureProjects()", () => {
  const manifestPath = path.join(
    "app",
    "build",
    "generated",
    "rnta",
    "src",
    "main",
    "AndroidManifest.xml"
  );

  it("returns empty config", () => {
    deepEqual(configureProjects({}), {});
  });

  it("returns Android config", () => {
    const sourceDir = "android";

    deepEqual(configureProjects({ android: { sourceDir } }), {
      android: {
        sourceDir,
        manifestPath,
        packageName,
      },
    });
  });

  it("returns Android config with package name", () => {
    const sourceDir = "android";
    const packageName = "com.testapp";
    const project = configureProjects({ android: { sourceDir, packageName } });

    deepEqual(project, { android: { sourceDir, manifestPath, packageName } });
  });

  it("returns iOS config", () => {
    const sourceDir = "ios";
    const config = { ios: { sourceDir } };

    deepEqual(configureProjects(config), config);
  });

  it("returns Windows config", () => {
    const sourceDir = "windows";
    const solutionFile = "windows/Example.sln";
    const vcxproj = "..\\node_modules\\.generated\\windows\\ReactApp.vcxproj";
    const project = configureProjects(
      { windows: { sourceDir, solutionFile } },
      {
        ...nodefs,
        existsSync: (p) => {
          return (
            p === solutionFile ||
            p.toString().endsWith("react-native.config.js")
          );
        },
        // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
        readFileSync: (p, options) => {
          return p === solutionFile ? vcxproj : nodefs.readFileSync(p, options);
        },
      }
    );

    deepEqual(project, {
      windows: {
        sourceDir,
        solutionFile: path.relative(sourceDir, solutionFile),
        project: {
          projectFile: vcxproj,
        },
      },
    });
  });
});

describe("findReactNativeConfig()", () => {
  const { findReactNativeConfig } = internalForTestingPurposesOnly;

  const configFiles = [
    "react-native.config.ts",
    "react-native.config.mjs",
    "react-native.config.cjs",
    "react-native.config.js",
  ];

  it("throws if no config file is found", () => {
    throws(
      () => findReactNativeConfig({ ...nodefs, existsSync: () => false }),
      new Error("Failed to find `react-native.config.[ts,mjs,cjs,js]`")
    );
  });

  for (const configFile of configFiles) {
    it(`finds '${configFile}'`, () => {
      const result = findReactNativeConfig({
        ...nodefs,
        existsSync: (p) => typeof p === "string" && p.endsWith(configFile),
      });
      ok(result.endsWith(configFile));
    });
  }
});

describe("getAndroidPackageName()", () => {
  const { getAndroidPackageName } = internalForTestingPurposesOnly;

  function mockfs(cliPlatformAndroidVersion: string): typeof nodefs {
    const appManifest = "app.json";
    const cliPlatformAndroidPackageManifest =
      /@react-native-community[/\\]cli-platform-android[/\\]package.json$/;
    return {
      ...nodefs,
      existsSync: (p) => p === appManifest,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === appManifest) {
          return JSON.stringify({ android: { package: "com.testapp" } });
        } else if (
          typeof p === "string" &&
          cliPlatformAndroidPackageManifest.test(p)
        ) {
          return JSON.stringify({
            name: "@react-native-community/cli-platform-android",
            version: cliPlatformAndroidVersion,
          });
        }

        fail(`Unexpected file read: ${p}`);
      },
    };
  }

  it("returns early if `@react-native-community/cli-platform-android` <12.3.7", () => {
    equal(getAndroidPackageName(mockfs("11.4.1")), undefined);
    equal(getAndroidPackageName(mockfs("12.3.6")), undefined);
  });

  it("returns package name if `@react-native-community/cli-platform-android` >=12.3.7 <13.0.0", () => {
    equal(getAndroidPackageName(mockfs("12.3.7")), packageName);
    equal(getAndroidPackageName(mockfs("12.999.999")), packageName);
  });

  it("returns early if `@react-native-community/cli-platform-android` <13.6.9", () => {
    equal(getAndroidPackageName(mockfs("13.0.0")), undefined);
    equal(getAndroidPackageName(mockfs("13.6.8")), undefined);
  });

  it("returns package name `@react-native-community/cli-platform-android` >=13.6.9", () => {
    equal(getAndroidPackageName(mockfs("13.6.9")), packageName);
    equal(getAndroidPackageName(mockfs("14.0.0")), packageName);
  });
});
