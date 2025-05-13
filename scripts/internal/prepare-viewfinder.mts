#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { readJSONFile } from "../helpers.js";
import { writeJSONFile } from "../utils/filesystem.mjs";

const APP_IDENTIFIER = "com.microsoft.ReactNativeViewfinder";
const PACKAGE_MANAGER = "yarn";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
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

  writeJSONFile(APP_MANIFEST, manifest);
}

/**
 * Runs the specified command.
 */
function $(command: string, args: string[], options?: Record<string, unknown>) {
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
$("npx", ["@rnx-kit/align-deps", "--write", PROJECT_MANIFEST]);
$(PACKAGE_MANAGER, ["install"]);
