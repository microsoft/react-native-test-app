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
  getPackageVersion,
  readTextFile,
  toVersionNumber,
  v,
} = require("../scripts/helpers");

// Maximum value of a 32-bit integer (to ensure compatibility across language
// boundaries)
const INT_MAX = 2 ** 31 - 1;

/**
 * This table is also used by `android/test-app-util.gradle`!
 *
 * We have two implementations because there are currently two ways to build the
 * Android app. If built via `@react-native-community/cli`, this script will be
 * run and we can change Gradle version before it is executed. If it's built
 * with Gradle directly, it's already too late and the best we can do is to warn
 * the user.
 *
 * Gradle version can be found in the template:
 * https://github.com/react-native-community/template/blob/main/template/android/gradle/wrapper/gradle-wrapper.properties
 *
 * @type {[number, [number, string], [number, string]][]}
 */
const GRADLE_VERSIONS = [
  [v(0, 76, 0), [v(8, 10, 1), "8.10.1"], [INT_MAX, ""]], // 0.76: [8.10.1, *)
  [v(0, 75, 0), [v(8, 8, 0), "8.8"], [v(8, 9, 0), "8.8"]], // 0.75: [8.8, 8.9)
  [v(0, 74, 0), [v(8, 6, 0), "8.6"], [v(8, 9, 0), "8.8"]], // 0.74: [8.6, 8.9)
  [v(0, 73, 0), [v(8, 3, 0), "8.3"], [v(8, 9, 0), "8.8"]], // 0.73: [8.3, 8.9)
  [v(0, 72, 0), [v(8, 1, 1), "8.1.1"], [v(8, 3, 0), "8.2.1"]], // 0.72: [8.1.1, 8.3)
  [0, [v(7, 5, 1), "7.6.4"], [v(8, 0, 0), "7.6.4"]], // <0.72: [7.5.1, 8.0.0)
];

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
      const versionStr = getPackageVersion("react-native", sourceDir, fs);
      const version = toVersionNumber(versionStr);
      for (const [rnVersion, lower, upper] of GRADLE_VERSIONS) {
        if (version >= rnVersion) {
          if (gradleVersion < lower[0]) {
            return lower[1];
          } else if (gradleVersion >= upper[0]) {
            return upper[1];
          }
          return undefined;
        }
      }
      throw new Error(`Unsupported React Native version: ${version}`);
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

exports.GRADLE_VERSIONS = GRADLE_VERSIONS;
exports.configureGradleWrapper = configureGradleWrapper;
