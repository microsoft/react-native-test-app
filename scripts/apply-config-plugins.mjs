#!/usr/bin/env node
// @ts-check

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { findFile } from "./validate-manifest.js";

/**
 * @typedef {import("./config-plugins/types.mjs").ProjectInfo["platforms"]} Platforms
 * @param {string} projectRoot
 * @param {string[]} platforms
 */
async function main(projectRoot = process.cwd(), platforms) {
  const packageJsonPath = findFile("package.json", projectRoot);
  if (!packageJsonPath) {
    throw new Error("Failed to find `package.json`");
  }

  const content = await fs.readFile(packageJsonPath, { encoding: "utf-8" });
  if (!content.includes('"@expo/config-plugins"')) {
    return;
  }

  const appJsonPath = findFile("app.json", projectRoot);
  if (!appJsonPath) {
    return;
  }

  const { applyConfigPlugins } = await import("./config-plugins/index.mjs");
  return applyConfigPlugins({
    projectRoot: path.dirname(appJsonPath),
    platforms: /** @type {Platforms} */ (platforms),
    packageJsonPath,
    appJsonPath,
  });
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    android: {
      description: "Apply Android config plugins",
      type: "boolean",
    },
    ios: {
      description: "Apply iOS config plugins",
      type: "boolean",
    },
    macos: {
      description: "Apply macOS config plugins",
      type: "boolean",
    },
    windows: {
      description: "Apply Windows config plugins",
      type: "boolean",
    },
  },
  strict: true,
  allowPositionals: true,
  tokens: false,
});

main(positionals[0], Object.keys(values));
