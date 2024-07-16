// @ts-check
"use strict";

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const { generateAndroidManifest } = require("../android/android-manifest");
const { configureGradleWrapper } = require("../android/gradle-wrapper");
const {
  findFile,
  findNearest,
  getPackageVersion,
  readJSONFile,
  readTextFile,
  toVersionNumber,
  v,
} = require("./helpers");

/**
 * @typedef {import("./types.js").ProjectConfig} ProjectConfig
 * @typedef {import("./types.js").ProjectParams} ProjectParams
 */

/**
 * Returns the version number of a React Native dependency.
 * @param {string} packageName
 * @returns {number}
 */
const getRNPackageVersion = (() => {
  const isTesting = "NODE_TEST_CONTEXT" in process.env;
  /** @type {Record<string, number>} */
  let versions = {};
  /** @type {(packageName: string) => number} */
  return (packageName, fs = nodefs) => {
    if (isTesting || !versions[packageName]) {
      const rnDir = path.dirname(require.resolve("react-native/package.json"));
      const versionString = getPackageVersion(packageName, rnDir, fs);
      versions[packageName] = toVersionNumber(versionString);
    }
    return versions[packageName];
  };
})();

/**
 * Returns the version number of `@react-native-community/cli-platform-ios`.
 * @returns {number}
 */
function cliPlatformIOSVersion() {
  return getRNPackageVersion("@react-native-community/cli-platform-ios");
}

/**
 * @param {string | undefined} manifestPath
 * @returns {string | undefined}
 */
function getAndroidPackageName(manifestPath, fs = nodefs) {
  if (!manifestPath) {
    return undefined;
  }

  const rncliAndroidVersion = getRNPackageVersion(
    "@react-native-community/cli-platform-android",
    fs
  );
  if (rncliAndroidVersion < v(12, 3, 7)) {
    // TODO: This block can be removed when we drop support for 0.72
    return undefined;
  }
  if (rncliAndroidVersion >= v(13, 0, 0) && rncliAndroidVersion < v(13, 6, 9)) {
    // TODO: This block can be removed when we drop support for 0.73
    return undefined;
  }

  /** @type {{ android?: { package?: string }}} */
  const manifest = readJSONFile(manifestPath, fs);
  return manifest.android?.package;
}

/**
 * @returns {string | undefined}
 */
function iosProjectPath() {
  const needsProjectPath = cliPlatformIOSVersion() < v(8, 0, 0);
  if (needsProjectPath) {
    // `sourceDir` and `podfile` detection was fixed in
    // @react-native-community/cli-platform-ios v5.0.2 (see
    // https://github.com/react-native-community/cli/pull/1444).
    return "node_modules/.generated/ios/ReactTestApp.xcodeproj";
  }

  return undefined;
}

/**
 * @param {string} solutionFile
 * @returns {ProjectParams["windows"]["project"]}
 */
function windowsProjectPath(solutionFile, fs = nodefs) {
  const sln = readTextFile(solutionFile, fs);
  const m = sln.match(
    /([^"]*?node_modules[/\\].generated[/\\]windows[/\\].*?\.vcxproj)/
  );
  return { projectFile: m ? m[1] : `(Failed to parse '${solutionFile}')` };
}

/**
 * @param {ProjectConfig} configuration
 * @returns {Partial<ProjectParams>}
 */
function configureProjects({ android, ios, windows }, fs = nodefs) {
  const reactNativeConfig = findNearest(
    "react-native.config.js",
    undefined,
    fs
  );
  if (!reactNativeConfig) {
    throw new Error("Failed to find `react-native.config.js`");
  }

  /** @type {Partial<ProjectParams>} */
  const config = {};

  if (android) {
    const { packageName, sourceDir } = android;
    const manifestPath = path.join(
      "app",
      "build",
      "generated",
      "rnta",
      "src",
      "main",
      "AndroidManifest.xml"
    );
    const projectRoot = path.dirname(reactNativeConfig);
    const appManifestPath = findFile("app.json", projectRoot, fs);
    if (appManifestPath) {
      generateAndroidManifest(
        appManifestPath,
        path.resolve(projectRoot, sourceDir, manifestPath),
        fs
      );
    }

    config.android = {
      sourceDir,
      manifestPath,
      packageName: packageName || getAndroidPackageName(appManifestPath, fs),
    };

    configureGradleWrapper(sourceDir, fs);
  }

  if (ios) {
    // `ios.sourceDir` was added in 8.0.0
    // https://github.com/react-native-community/cli/commit/25eec7c695f09aea0ace7c0b591844fe8828ccc5
    if (cliPlatformIOSVersion() >= v(8, 0, 0)) {
      config.ios = ios;
    }
    const project = iosProjectPath();
    if (project) {
      config.ios = config.ios ?? {};
      config.ios.project = project;
    }
  }

  if (windows && fs.existsSync(windows.solutionFile)) {
    const { sourceDir, solutionFile } = windows;
    config.windows = {
      sourceDir,
      solutionFile: path.relative(sourceDir, solutionFile),
      project: windowsProjectPath(solutionFile, fs),
    };
  }

  return config;
}

exports.cliPlatformIOSVersion = cliPlatformIOSVersion;
exports.configureProjects = configureProjects;
exports.internalForTestingPurposesOnly = {
  getAndroidPackageName,
};
