// @ts-check
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
