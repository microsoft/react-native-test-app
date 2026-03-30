import { XMLParser } from "fast-xml-parser";
import { deepEqual, equal, ok, throws } from "node:assert/strict";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  configureProjects,
  internalForTestingPurposesOnly,
} from "../scripts/configure-projects.js";

const getAndroidPackageNameFromManifest = (() => {
  let packageName = "";
  return () => {
    if (!packageName) {
      const androidManifestXml = nodefs.readFileSync(
        "android/app/src/main/AndroidManifest.xml",
        { encoding: "utf-8" }
      );

      const xml = new XMLParser({ ignoreAttributes: false });
      const { manifest } = xml.parse(androidManifestXml);

      packageName = manifest["@_package"];
    }

    return packageName;
  };
})();

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
        packageName: getAndroidPackageNameFromManifest(),
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

  it("returns package name set in 'AndroidManifest.xml'", () => {
    equal(getAndroidPackageNameFromManifest(), getAndroidPackageName());
  });
});
