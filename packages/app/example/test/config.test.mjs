// @ts-check
import { deepEqual, equal, match, notEqual, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { configureProjects } from "../../scripts/configure-projects.js";
import { readJSONFile } from "../../scripts/helpers.js";

/**
 * @param {string} cwd
 */
async function getLoadConfig(cwd) {
  try {
    const config = import.meta.resolve(
      "@react-native-community/cli/build/tools/config",
      cwd
    );
    return await import(config);
  } catch (_) {
    // `loadConfig` was made public in 7.0:
    // https://github.com/react-native-community/cli/pull/1464
    const rncCli = import.meta.resolve("@react-native-community/cli", cwd);
    const { default: cli } = await import(rncCli);
    return cli.loadConfig.length === 1
      ? () => cli.loadConfig({}) // >=14.0
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

/**
 * @param {string} spec
 * @param {string} projectRoot
 * @returns {boolean}
 */
function requiresDependency(spec, projectRoot) {
  /** @type {{ dependencies: Record<string, string> }} */
  const { dependencies } = readJSONFile(path.join(projectRoot, "package.json"));
  return Object.hasOwn(dependencies, spec);
}

describe("react-native config", async () => {
  const currentDir = process.cwd();
  const loadConfig = await getLoadConfig(currentDir);

  const reactNativePath = path.join(currentDir, "node_modules", "react-native");

  const shouldSkipIOS = process.platform === "win32";
  const shouldSkipMacOS =
    shouldSkipIOS || !requiresDependency("react-native-macos", currentDir);
  const shouldSkipWindows =
    process.platform !== "win32" ||
    !requiresDependency("react-native-windows", currentDir);

  it("contains Android config", () => {
    const sourceDir = path.join(currentDir, "android");
    const config = loadConfig();

    equal(typeof config, "object");
    match(config.root, regexp(currentDir));
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

  it("contains iOS config", { skip: shouldSkipIOS }, () => {
    const sourceDir = path.join(currentDir, "ios");
    const config = loadConfig();

    equal(typeof config, "object");
    match(config.root, regexp(currentDir));
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
  });

  it("contains macOS config", { skip: shouldSkipMacOS }, () => {
    const sourceDir = path.join(currentDir, "macos");
    const config = loadConfig();

    equal(typeof config, "object");
    match(config.root, regexp(currentDir));
    match(config.reactNativePath, regexp(reactNativePath));
    equal(
      config.dependencies["react-native-test-app"].name,
      "react-native-test-app"
    );
    notEqual(config.platforms.macos, undefined);
    match(config.project.macos.sourceDir, regexp(sourceDir));

    if (fs.existsSync("macos/Pods")) {
      equal(config.project.macos.xcodeProject.name, "Example.xcworkspace");
      ok(config.project.macos.xcodeProject.isWorkspace);
    } else {
      equal(config.project.macos.xcodeProject, null);
    }
  });

  it("contains Windows config", { skip: shouldSkipWindows }, () => {
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
    match(config.root, regexp(currentDir));
    match(config.reactNativePath, regexp(reactNativePath));
    equal(
      config.dependencies["react-native-test-app"].name,
      "react-native-test-app"
    );
    equal(config.platforms.windows.npmPackageName, "react-native-windows");
    match(config.project.windows.folder, regexp(currentDir));
    match(config.project.windows.sourceDir, /windows/);
    match(config.project.windows.solutionFile, /Example.sln/);
    match(config.project.windows.project.projectFile, regexp(projectFile));
  });
});

describe("configureProjects()", () => {
  const isMain = path.basename(process.cwd()) === "example";

  // Only the main example app includes web
  it("returns externally provided platform config", { skip: !isMain }, () => {
    deepEqual(configureProjects({ web: true }), {
      web: {
        "@rnx-kit/react-native-template-web": true,
      },
    });
  });
});
