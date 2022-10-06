#!/usr/bin/env node
// @ts-check

import * as fs from "fs/promises";
import * as path from "path";
import { findFile } from "./validate-manifest.js";

async function main(projectRoot = process.cwd()) {
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
    packageJsonPath,
    appJsonPath,
  });
}

const { [2]: projectRoot } = process.argv;
main(projectRoot);
