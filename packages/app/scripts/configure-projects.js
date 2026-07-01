// @ts-check
"use strict";

/** @import { ProjectConfig, ProjectParams } from "./types.ts"; */

/**
 * This script (and its dependencies) currently cannot be converted to ESM
 * because it is consumed in `react-native.config.js`.
 */
const nodefs = require("node:fs");
const path = require("node:path");
const { getAndroidPackageName } = require("../android/template.config.mjs");
const { findNearest } = require("./helpers.js");
const { loadPlatformTemplates } = require("./template.mjs");

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
 * @param {ProjectConfig} projectConfig
 * @returns {Partial<ProjectParams>}
 */
function configureProjects(projectConfig, fs = nodefs) {
  const reactNativeConfig = findReactNativeConfig(fs);

  /** @type {Partial<ProjectParams>} */
  const config = {};

  const projectRoot = path.dirname(reactNativeConfig);
  const params = {
    packagePath: projectRoot,
    testAppPath: path.dirname(__dirname),
  };
  const templates = loadPlatformTemplates(params, fs);
  for (const [platform, { configure }] of Object.entries(templates)) {
    const platformConfig = projectConfig[platform];
    if (platformConfig) {
      config[platform] = configure(projectRoot, platformConfig, fs);
    }
  }

  return config;
}

exports.configureProjects = configureProjects;
exports.internalForTestingPurposesOnly = {
  findReactNativeConfig,
  getAndroidPackageName,
};
