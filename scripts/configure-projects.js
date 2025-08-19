// @ts-check
"use strict";

/** @import { ProjectConfig, ProjectParams } from "./types.js"; */

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const { generateAndroidManifest } = require("../android/android-manifest");
const { configureGradleWrapper } = require("../android/gradle-wrapper");
const { findFile, findNearest, readTextFile } = require("./helpers");

/**
 * Finds `react-native.config.[ts,mjs,cjs,js]`.
 *
 * @note A naive search on disk might yield false positives so we also try to
 * use the stack trace to find it. This currently works in Node (V8) and Bun
 * (JSC).
 *
 * @returns {string} Path to `react-native.config.[ts,mjs,cjs,js]`
 */
function findReactNativeConfig(fs = nodefs) {
  // stack[0] holds this file
  // stack[1] holds where this function was called
  // stack[2] holds the file we're interested in
  const position = 2;
  if (position < Error.stackTraceLimit) {
    const orig_prepareStackTrace = Error.prepareStackTrace;
    let stack;
    try {
      Error.prepareStackTrace = (_, stack) => stack;
      stack = new Error().stack;
    } finally {
      Error.prepareStackTrace = orig_prepareStackTrace;
    }

    if (Array.isArray(stack)) {
      const callsite = stack[position];
      if (
        callsite &&
        typeof callsite === "object" &&
        "getFileName" in callsite
      ) {
        const file = callsite.getFileName();
        if (path.basename(file).startsWith("react-native.config.")) {
          return file;
        }
      }
    }
  }

  const configFiles = [
    "react-native.config.ts",
    "react-native.config.mjs",
    "react-native.config.cjs",
    "react-native.config.js",
  ];

  for (const file of configFiles) {
    const reactNativeConfig = findNearest(file, undefined, fs);
    if (reactNativeConfig) {
      return reactNativeConfig;
    }
  }

  throw new Error("Failed to find `react-native.config.[ts,mjs,cjs,js]`");
}

/**
 * @returns {string | undefined}
 */
function getAndroidPackageName() {
  return "com.microsoft.reacttestapp";
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
  const reactNativeConfig = findReactNativeConfig(fs);

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
      packageName: packageName || getAndroidPackageName(),
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
  findReactNativeConfig,
  getAndroidPackageName,
};
