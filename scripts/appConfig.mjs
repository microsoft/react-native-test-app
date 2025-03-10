// @ts-check
import * as nodefs from "node:fs";
import { findFile, readJSONFile } from "./helpers.js";

/** @import { JSONObject } from "../scripts/types.js"; */

const SOURCE_KEY = Symbol.for("source");

/** @type {JSONObject} */
let appConfig;

export function loadAppConfig(startDir = process.cwd(), fs = nodefs) {
  if (!appConfig) {
    const configFile = findFile("app.json", startDir, fs);
    appConfig = configFile ? readJSONFile(configFile) : {};
    appConfig[SOURCE_KEY] = configFile || startDir;
  }
  return appConfig;
}

/**
 * @param {JSONObject} appConfig
 * @returns {string}
 */
export function sourceForAppConfig(appConfig) {
  const source = appConfig[SOURCE_KEY];
  if (typeof source !== "string") {
    throw new Error("Source for app config should've been set");
  }
  return source;
}
