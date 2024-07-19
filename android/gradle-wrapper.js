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
      if (version === 0 || version >= v(0, 76, 0)) {
        if (gradleVersion < v(8, 9, 0)) {
          return "8.9";
        }
      } else if (version >= v(0, 75, 0)) {
        if (gradleVersion < v(8, 8, 0)) {
          return "8.8";
        } else if (gradleVersion >= v(8, 9, 0)) {
          return "8.8";
        }
      } else if (version >= v(0, 74, 0)) {
        if (gradleVersion < v(8, 6, 0)) {
          return "8.6";
        } else if (gradleVersion >= v(8, 9, 0)) {
          return "8.8";
        }
      } else if (version >= v(0, 73, 0)) {
        if (gradleVersion < v(8, 3, 0)) {
          return "8.3";
        } else if (gradleVersion >= v(8, 9, 0)) {
          return "8.8";
        }
      } else if (version >= v(0, 72, 0)) {
        if (gradleVersion < v(8, 1, 1)) {
          return "8.1.1";
        } else if (gradleVersion >= v(8, 3, 0)) {
          return "8.2.1";
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

exports.configureGradleWrapper = configureGradleWrapper;
