// @ts-check
"use strict";

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const tty = require("node:tty");
const { generateAndroidManifest } = require("../android/android-manifest");
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
 * Configures Gradle wrapper as necessary before the Android app is built.
 * @param {string} sourceDir
 */
function configureGradleWrapper(sourceDir, fs = nodefs) {
  const androidCommands = ["build-android", "run-android"];
  if (
    process.env["RNTA_CONFIGURE_GRADLE_WRAPPER"] === "0" ||
    !process.argv.some((arg) => androidCommands.includes(arg))
  ) {
    return;
  }

  const gradleWrapperProperties = path.join(
    sourceDir,
    "gradle",
    "wrapper",
    "gradle-wrapper.properties"
  );
  if (!fs.existsSync(gradleWrapperProperties)) {
    return;
  }

  const tag = tty.WriteStream.prototype.hasColors()
    ? "\u001B[33m\u001B[1mwarn\u001B[22m\u001B[39m"
    : "warn";

  try {
    const props = readTextFile(gradleWrapperProperties, fs);
    const re = /gradle-([.0-9]*?)-.*?\.zip/;
    const m = props.match(re);
    if (!m) {
      return;
    }

    const gradleVersion = (() => {
      const gradleVersion = toVersionNumber(m[1]);
      const version = toVersionNumber(
        getPackageVersion("react-native", sourceDir, fs)
      );
      if (version === 0 || version >= v(0, 74, 0)) {
        if (gradleVersion < v(8, 6, 0)) {
          return "8.6";
        }
      } else if (version >= v(0, 73, 0)) {
        if (gradleVersion < v(8, 3, 0)) {
          return "8.3";
        }
      } else if (version >= v(0, 72, 0)) {
        if (gradleVersion < v(8, 1, 1)) {
          return "8.1.1";
        }
      } else if (gradleVersion < v(7, 5, 1) || gradleVersion >= v(8, 0, 0)) {
        return "7.6.4";
      }
      return undefined;
    })();

    if (gradleVersion) {
      console.warn(tag, `Setting Gradle version ${gradleVersion}`);
      fs.writeFileSync(
        gradleWrapperProperties,
        props.replace(re, `gradle-${gradleVersion}-bin.zip`)
      );
    }
  } catch (_) {
    console.warn(tag, "Failed to determine Gradle version");
  }
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
  configureGradleWrapper,
  getAndroidPackageName,
};
