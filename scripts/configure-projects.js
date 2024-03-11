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
 * @param {string | undefined} manifestPath
 * @returns {string | undefined}
 */
function getAndroidPackageName(manifestPath, fs = nodefs) {
  if (!manifestPath) {
    return undefined;
  }

  try {
    const rncliAndroidVersion = getRNPackageVersion(
      "@react-native-community/cli-platform-android",
      fs
    );
    if (rncliAndroidVersion < v(12, 3, 7)) {
      // TODO: This block can be removed when we drop support for 0.72
      return undefined;
    }
    if (
      rncliAndroidVersion >= v(13, 0, 0) &&
      rncliAndroidVersion < v(13, 6, 9)
    ) {
      // TODO: This block can be removed when we drop support for 0.73
      return undefined;
    }
  } catch (_) {
    // We're on 0.76 or later
  }

  /** @type {{ android?: { package?: string }}} */
  const manifest = readJSONFile(manifestPath, fs);
  return manifest.android?.package;
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
    config.ios = ios;
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

exports.configureProjects = configureProjects;
exports.internalForTestingPurposesOnly = {
  getAndroidPackageName,
};
