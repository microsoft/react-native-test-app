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
 * @param {string} p
 * @param {ApplePlatform} targetPlatform
 * @returns {string}
 */
export function projectPath(p, targetPlatform) {
  const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  return path.join(packageDir, targetPlatform, p);
}

/**
 * @param {JSONObject} source
 * @param {string} filename
 * @returns {string}
 */
export function toPlist(source, filename) {
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
