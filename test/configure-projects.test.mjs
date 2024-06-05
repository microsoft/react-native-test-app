import { deepEqual, equal } from "node:assert/strict";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  configureProjects,
  internalForTestingPurposesOnly,
} from "../scripts/configure-projects.js";

describe("configureProjects()", () => {
  const manifestPath = path.join("app", "src", "main", "AndroidManifest.xml");

  it("returns empty config", () => {
    deepEqual(configureProjects({}), {});
  });

  it("returns Android config", () => {
    const sourceDir = "android";

    deepEqual(configureProjects({ android: { sourceDir } }), {
      android: {
        sourceDir,
        manifestPath,
        packageName: undefined,
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

describe("getAndroidPackageName()", () => {
  const { getAndroidPackageName } = internalForTestingPurposesOnly;

  const packageId = "com.testapp";

  /**
   * @param {string} cliPlatformAndroidVersion
   * @returns {typeof nodefs}
   */
  function mockfs(cliPlatformAndroidVersion) {
    const appManifest = "app.json";
    const cliPlatformAndroidPackageManifest =
      /@react-native-community[/\\]cli-platform-android[/\\]package.json$/;
    return {
      ...nodefs,
      existsSync: (p) => p === appManifest,
      // @ts-expect-error Type 'string' is not assignable to type 'Buffer'
      readFileSync: (p) => {
        if (p === appManifest) {
          return JSON.stringify({ android: { package: packageId } });
        } else if (
          typeof p === "string" &&
          cliPlatformAndroidPackageManifest.test(p)
        ) {
          return JSON.stringify({
            name: "@react-native-community/cli-platform-android",
            version: cliPlatformAndroidVersion,
          });
        }
        throw new Error(`Tried to read '${p}'`);
      },
    };
  }

  it("returns early if app manifest cannot be found", () => {
    equal(getAndroidPackageName("android"), undefined);
  });

  it("returns early if `@react-native-community/cli-platform-android` <12.3.7", () => {
    equal(getAndroidPackageName("android", mockfs("12.3.6")), undefined);
  });

  it("returns package name if `@react-native-community/cli-platform-android` >=12.3.7 <13.0.0", () => {
    equal(getAndroidPackageName("android", mockfs("12.3.7")), packageId);
  });

  it("returns early if `@react-native-community/cli-platform-android` <13.6.9", () => {
    equal(getAndroidPackageName("android", mockfs("13.6.8")), undefined);
  });

  it("returns package name `@react-native-community/cli-platform-android` >=13.6.9", () => {
    equal(getAndroidPackageName("android", mockfs("13.6.9")), packageId);
  });
});
