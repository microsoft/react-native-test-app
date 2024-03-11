// @ts-check
import { equal, match, notEqual, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { after, before, test } from "node:test";
import { URL, fileURLToPath } from "node:url";

async function getLoadConfig() {
  try {
    // @ts-expect-error `loadConfig` was not exported until 7.0.
    return await import("@react-native-community/cli/build/tools/config");
  } catch (_) {
    // `loadConfig` was made public in 7.0:
    // https://github.com/react-native-community/cli/pull/1464
    const { default: cli } = await import("@react-native-community/cli");
    return cli.loadConfig.length === 1
      ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore The signature change of `loadConfig` was introduced in 14.0
        () => cli.loadConfig({}) // >=14.0
      : cli.loadConfig; // <14.0
  }
}

/**
 * @param {string} p
 * @returns {RegExp}
 */
function regexp(p) {
  return new RegExp(p.replaceAll("\\", "\\\\"));
}

test("react-native config", async (t) => {
  const loadConfig = await getLoadConfig();

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

  await t.test("contains Android config", () => {
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
  });

  await t.test(
    "contains iOS config",
    { skip: process.platform === "win32" },
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

      if (fs.existsSync("ios/Pods")) {
        equal(config.project.ios.xcodeProject.name, "Example.xcworkspace");
        ok(config.project.ios.xcodeProject.isWorkspace);
      } else {
        equal(config.project.ios.xcodeProject, null);
      }
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
