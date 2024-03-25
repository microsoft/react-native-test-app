// @ts-check
"use strict";

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const tty = require("node:tty");
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

  try {
    const version = toVersionNumber(
      getPackageVersion("react-native", sourceDir, fs)
    );

    const gradleWrapperProperties = path.join(
      sourceDir,
      "gradle",
      "wrapper",
      "gradle-wrapper.properties"
    );
    const props = readTextFile(gradleWrapperProperties);
    const re = /gradle-([.0-9]*?)-.*?\.zip/;
    const m = props.match(re);
    if (!m) {
      return;
    }

    const gradleVersion = (() => {
      const gradleVersion = toVersionNumber(m[1]);
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
      const tag = tty.WriteStream.prototype.hasColors()
        ? "\u001B[33m\u001B[1mwarn\u001B[22m\u001B[39m"
        : "warn";
      console.warn(tag, `Setting Gradle version ${gradleVersion}`);
      fs.writeFileSync(
        gradleWrapperProperties,
        props.replace(re, `gradle-${gradleVersion}-bin.zip`)
      );
    }
  } catch (_) {
    // ignore
  }
}

/**
 * @param {string} sourceDir
 * @returns {string}
 */
function androidManifestPath(sourceDir) {
  return path.relative(
    sourceDir,
    path.join(
      path.dirname(__dirname),
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
    configureGradleWrapper(android.sourceDir, fs);
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
