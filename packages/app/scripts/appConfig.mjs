// @ts-check
import * as nodefs from "node:fs";
import { findFile, readJSONFile } from "./helpers.js";

/** @import { JSONObject } from "../scripts/types.js"; */

const SOURCE_KEY = Symbol.for("source");

/**
 * @param {string} projectRoot
 * @returns {JSONObject}
 */
export function loadAppConfig(projectRoot, fs = nodefs) {
  const configFile = findFile("app.json", projectRoot, fs);

  /** @type {JSONObject} */
  const appConfig = configFile ? readJSONFile(configFile, fs) : {};
  appConfig[SOURCE_KEY] = configFile || projectRoot;

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
