#!/usr/bin/env node
// @ts-check

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readJSONFile } from "./helpers.js";

const APP_IDENTIFIER = "com.microsoft.ReactNativeViewfinder";
const PACKAGE_MANAGER = "yarn";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const APP_ROOT = path.resolve(PROJECT_ROOT, "example");
const APP_MANIFEST = path.resolve(APP_ROOT, "app.json");
const PROJECT_MANIFEST = path.resolve(APP_ROOT, "package.json");

/**
 * Configures the app manifest for Viewfinder.
 */
function configureAppManifest() {
  const original = readJSONFile(APP_MANIFEST);

  const manifest = {
    ...original,
    $schema: undefined,
    name: "Viewfinder",
    displayName: "Viewfinder",
    components: [],
    android: {
      package: APP_IDENTIFIER,
    },
    ios: {
      bundleIdentifier: APP_IDENTIFIER,
    },
  };

  fs.writeFileSync(APP_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

/**
 * Runs the specified command.
 * @param {string} command
 * @param {string[]} args
 * @param {Record<string, unknown>=} options
 */
function run(command, args, options) {
  const { error, status } = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    stdio: "inherit",
    ...options,
  });
  if (status !== 0) {
    throw error ?? new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

configureAppManifest();
run("npx", ["@rnx-kit/align-deps", "--write", PROJECT_MANIFEST]);
run(PACKAGE_MANAGER, ["install"]);
