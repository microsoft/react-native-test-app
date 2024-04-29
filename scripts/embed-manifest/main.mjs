// @ts-check
import { createHash } from "node:crypto";
import * as nodefs from "node:fs";
import { findFile } from "../helpers.js";
import { validate } from "./validate.mjs";

/**
 * @param {(json: Record<string, unknown>, checksum: string, fs?: typeof nodefs) => string} generate
 * @param {string} projectRoot
 * @returns {number}
 */
export function main(generate, projectRoot = process.cwd(), fs = nodefs) {
  const manifestPath = findFile("app.json", projectRoot, fs);
  const manifest = validate(manifestPath, fs);
  if (typeof manifest === "number") {
    return manifest;
  }

  const checksum = createHash("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex");
  const provider = generate(manifest, checksum, fs);
  if (!provider) {
    return 1;
  }

  console.log(provider);
  return 0;
}

/**
 * @param {string} message
 */
export function warn(message) {
  console.warn("app.json:", message);
}
