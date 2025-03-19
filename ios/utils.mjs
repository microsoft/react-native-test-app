// @ts-check
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {import("../scripts/types.ts").ApplePlatform} ApplePlatform;
 * @typedef {import("../scripts/types.ts").JSONObject} JSONObject;
 * @typedef {import("../scripts/types.ts").JSONValue} JSONValue;
 */

/**
 * @param {JSONValue} obj
 * @returns {obj is JSONObject}
 */
export function isObject(obj) {
  return Boolean(obj && typeof obj === "object" && !Array.isArray(obj));
}

/**
 * @param {string} filename
 * @returns {JSONObject}
 */
export function jsonFromPlist(filename) {
  const args = ["-convert", "json", "-o", "-", filename];
  const plutil = spawnSync("/usr/bin/plutil", args, {
    stdio: ["ignore", "pipe", "inherit"],
  });

  if (plutil.status !== 0) {
    throw new Error(`Failed to read '${filename}'`);
  }

  return JSON.parse(plutil.stdout.toString());
}

/**
 * @param {JSONObject} source
 * @param {string} filename
 * @returns {string}
 */
export function plistFromJSON(source, filename) {
  const args = ["-convert", "xml1", "-r", "-o", "-", "--", "-"];
  const plutil = spawnSync("/usr/bin/plutil", args, {
    stdio: ["pipe", "pipe", "inherit"],
    input: JSON.stringify(source),
  });

  if (plutil.status !== 0) {
    throw new Error(`Failed to generate '${filename}'`);
  }

  return plutil.stdout.toString();
}

/**
 * @param {string} p
 * @param {ApplePlatform} targetPlatform
 * @returns {string}
 */
export function projectPath(p, targetPlatform) {
  const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  return path.join(packageDir, targetPlatform, p);
}

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @returns {JSONValue[] | undefined}
 */
export function resolveResources(appConfig, targetPlatform) {
  const resources = appConfig["resources"];
  if (resources && typeof resources === "object") {
    if (Array.isArray(resources)) {
      return resources;
    }

    const res = resources[targetPlatform];
    if (Array.isArray(res)) {
      return res;
    }
  }

  return undefined;
}
