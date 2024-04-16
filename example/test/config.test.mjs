// @ts-check
import { deepEqual, equal, match, notEqual } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { findNearest, readJSONFile } from "../../scripts/helpers.js";

function getCliVersion() {
  const cli = findNearest(
    "node_modules/@react-native-community/cli/package.json"
  );
  if (!cli) {
    throw new Error("Could not find '@react-native-community/cli'");
  }

  const { version } = readJSONFile(cli);
  if (typeof version !== "string") {
    throw new Error(
      `Invalid version string for '@react-native-community/cli': ${version}`
    );
  }

  return version;
}

async function getLoadConfig() {
  try {
    // @ts-expect-error `loadConfig` was not exported until 7.0.
    return await import("@react-native-community/cli/build/tools/config");
  } catch (_) {
    // `loadConfig` was made public in 7.0:
    // https://github.com/react-native-community/cli/pull/1464
    const { default: cli } = await import("@react-native-community/cli");
    return cli.loadConfig;
  }
}

/**
 * @param {string} p
 * @returns {RegExp}
 */
function regexp(p) {
  return new RegExp(p.replace(/\\/g, "\\\\"));
}

test("react-native config", async (t) => {
  const loadConfig = await getLoadConfig();
  const cliMajorVersion = Number(getCliVersion().split(".")[0]);

  const currentDir = process.cwd();
  const projectRoot = path.sep + "react-native-test-app";
  const exampleRoot = path.join(projectRoot, "example");
  const reactNativePath = path.join(
    projectRoot,
    "node_modules",
    "react-native"
  );

  before(() => process.chdir(fileURLToPath(new URL("..", import.meta.url))));

  after(() => process.chdir(currentDir));

  await t.test(
    "contains Android config (@react-native-community/cli <8.0.0)",
    { skip: cliMajorVersion >= 8 },
    () => {
      const sourceDir = path.join(exampleRoot, "android");
      const config = loadConfig();

      equal(typeof config, "object");
      match(config.root, regexp(exampleRoot));
      match(config.reactNativePath, regexp(reactNativePath));
      equal(
        config.dependencies["react-native-test-app"].name,
        "react-native-test-app"
      );
      deepEqual(config.assets, []);
      notEqual(config.platforms.android, undefined);
      match(config.project.android.sourceDir, regexp(sourceDir));
      match(config.project.android.folder, regexp(exampleRoot));
      match(
        config.project.android.manifestPath,
        regexp(
          path.join(
            "react-native-test-app",
            "android",
            "app",
            "src",
            "main",
            "AndroidManifest.xml"
          )
        )
      );
      match(
        config.project.android.buildGradlePath,
        regexp(path.join(sourceDir, "build.gradle"))
      );
      match(
        config.project.android.settingsGradlePath,
        regexp(path.join(sourceDir, "settings.gradle"))
      );
      equal(config.project.android.packageName, "com.microsoft.reacttestapp");
      equal(
        config.project.android.packageFolder,
        path.join("com", "microsoft", "reacttestapp")
      );
    }
  );

  await t.test(
    "contains Android config (@react-native-community/cli >=8.0.0)",
    { skip: cliMajorVersion < 8 },
    () => {
      const sourceDir = path.join(exampleRoot, "android");
      const config = loadConfig();

      equal(typeof config, "object");
      match(config.root, regexp(exampleRoot));
      match(config.reactNativePath, regexp(reactNativePath));
      equal(
        config.dependencies["react-native-test-app"].name,
        "react-native-test-app"
      );
      notEqual(config.platforms.android, undefined);
      match(config.project.android.sourceDir, regexp(sourceDir));
      equal(
        config.project.android.appName,
        fs.existsSync("android/app") ? "app" : ""
      );
      equal(config.project.android.packageName, "com.microsoft.reacttestapp");
    }
  );

  await t.test(
    "contains iOS config (@react-native-community/cli <8.0.0)",
    { skip: process.platform === "win32" || cliMajorVersion >= 8 },
    () => {
      const sourceDir = path.join(exampleRoot, "ios");
      const config = loadConfig();

      equal(typeof config, "object");
      match(config.root, regexp(exampleRoot));
      match(config.reactNativePath, regexp(reactNativePath));
      equal(
        config.dependencies["react-native-test-app"].name,
        "react-native-test-app"
      );
      deepEqual(config.assets, []);
      notEqual(config.platforms.ios, undefined);
      match(config.project.ios.sourceDir, regexp(sourceDir));
      match(config.project.ios.folder, regexp(exampleRoot));
      match(
        config.project.ios.podfile,
        regexp(path.join(sourceDir, "Podfile"))
      );
      match(
        config.project.ios.podspecPath,
        regexp(path.join(exampleRoot, "Example-Tests.podspec"))
      );
    }
  );

  await t.test(
    "contains iOS config (@react-native-community/cli >=8.0.0)",
    { skip: process.platform === "win32" || cliMajorVersion < 8 },
    () => {
      const sourceDir = path.join(exampleRoot, "ios");
      const config = loadConfig();

      equal(typeof config, "object");
      match(config.root, regexp(exampleRoot));
      match(config.reactNativePath, regexp(reactNativePath));
      equal(
        config.dependencies["react-native-test-app"].name,
        "react-native-test-app"
      );
      notEqual(config.platforms.ios, undefined);
      match(config.project.ios.sourceDir, regexp(sourceDir));
      deepEqual(
        config.project.ios.xcodeProject,
        fs.existsSync("ios/Pods")
          ? { name: "Example.xcworkspace", isWorkspace: true }
          : null
      );
    }
  );

  await t.test(
    "contains Windows config",
    { skip: process.platform !== "win32" },
    () => {
      const projectFile = path.join(
        "node_modules",
        ".generated",
        "windows",
        "ReactTestApp",
        "ReactTestApp.vcxproj"
      );

      if (!fs.existsSync(projectFile)) {
        console.warn(`No such file: ${projectFile}`);
        return;
      }

      const config = loadConfig();

      equal(typeof config, "object");
      match(config.root, regexp(exampleRoot));
      match(config.reactNativePath, regexp(reactNativePath));
      equal(
        config.dependencies["react-native-test-app"].name,
        "react-native-test-app"
      );
      equal(config.platforms.windows.npmPackageName, "react-native-windows");
      match(config.project.windows.folder, regexp(exampleRoot));
      match(config.project.windows.sourceDir, /windows/);
      match(config.project.windows.solutionFile, /Example.sln/);
      match(config.project.windows.project.projectFile, regexp(projectFile));
    }
  );
});
