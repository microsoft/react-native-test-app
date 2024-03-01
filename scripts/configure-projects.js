// @ts-check
"use strict";

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const {
  findNearest,
  getPackageVersion,
  readTextFile,
  toVersionNumber,
  v,
} = require("./helpers");

/**
 * @typedef {import("./types").ProjectConfig} ProjectConfig
 * @typedef {import("./types").ProjectParams} ProjectParams
 */

/**
 * Returns the version number of `@react-native-community/cli-platform-ios`.
 * @param {string} reactNativeDir
 * @returns {number}
 */
const cliPlatformIOSVersion = (() => {
  /** @type {number} */
  let version;
  /** @type {(reactNativeDir: string) => number} */
  return (reactNativeDir) => {
    if (!version) {
      version = toVersionNumber(
        getPackageVersion(
          "@react-native-community/cli-platform-ios",
          reactNativeDir
        )
      );
    }
    return version;
  };
})();

/**
 * @param {string} sourceDir
 * @returns {string}
 */
function androidManifestPath(sourceDir) {
  return path.relative(
    sourceDir,
    path.join(
      path.dirname(require.resolve("../package.json")),
      "android",
      "app",
      "src",
      "main",
      "AndroidManifest.xml"
    )
  );
}

/**
 * @returns {string | undefined}
 */
function iosProjectPath() {
  const rnDir = path.dirname(require.resolve("react-native/package.json"));
  const needsProjectPath = cliPlatformIOSVersion(rnDir) < v(8, 0, 0);
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
  const reactNativeConfig = findNearest("react-native.config.js");
  if (!reactNativeConfig) {
    throw new Error("Failed to find `react-native.config.js`");
  }

  /** @type {Partial<ProjectParams>} */
  const config = {};
  const projectRoot = path.dirname(reactNativeConfig);

  if (android) {
    config.android = {
      sourceDir: android.sourceDir,
      manifestPath: androidManifestPath(
        path.resolve(projectRoot, android.sourceDir)
      ),
    };
  }

  if (ios) {
    // `ios.sourceDir` was added in 8.0.0
    // https://github.com/react-native-community/cli/commit/25eec7c695f09aea0ace7c0b591844fe8828ccc5
    const rnDir = path.dirname(require.resolve("react-native/package.json"));
    if (cliPlatformIOSVersion(rnDir) >= v(8, 0, 0)) {
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
