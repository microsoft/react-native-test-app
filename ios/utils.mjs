// @ts-check
import { spawn } from "node:child_process";
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
 * @returns {Promise<string>}
 */
export function toPlist(source) {
  return new Promise((resolve, reject) => {
    const args = ["-convert", "xml1", "-r", "-o", "-", "--", "-"];
    const plutil = spawn("/usr/bin/plutil", args, {
      stdio: ["pipe", "pipe", "inherit"],
    });

    /** @type {string[]} */
    const data = [];
    plutil.stdout.on("data", (chunk) => data.push(chunk.toString()));

    plutil.on("exit", (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error("Failed to generate 'PrivacyInfo.xcprivacy'"));
      } else {
        resolve(data.join(""));
      }
    });

    plutil.stdin.write(JSON.stringify(source));
    plutil.stdin.end();
  });
}
