// @ts-check
"use strict";

/** @import { ProjectConfig, ProjectParams } from "./types.js"; */

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const {
  configure: configureAndroid,
  getAndroidPackageName,
} = require("../android/template.config.mjs");
const { configure: configureIOS } = require("../ios/template.config.mjs");
const {
  configure: configureWindows,
} = require("../windows/template.config.mjs");
const { findNearest } = require("./helpers");

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
 * @param {ProjectConfig} configuration
 * @returns {Partial<ProjectParams>}
 */
function configureProjects({ android, ios, windows }, fs = nodefs) {
  const reactNativeConfig = findReactNativeConfig(fs);

  /** @type {Partial<ProjectParams>} */
  const config = {};

  const projectRoot = path.dirname(reactNativeConfig);
  if (android) {
    config.android = configureAndroid(projectRoot, android, fs);
  }
  if (ios) {
    config.ios = configureIOS(projectRoot, ios, fs);
  }
  if (windows) {
    config.windows = configureWindows(projectRoot, windows, fs);
  }

  return config;
}

exports.configureProjects = configureProjects;
exports.internalForTestingPurposesOnly = {
  findReactNativeConfig,
  getAndroidPackageName,
};
