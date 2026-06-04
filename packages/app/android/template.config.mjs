// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { findFile } from "../scripts/helpers.js";
import { generateAndroidManifest } from "./android-manifest.js";
import { configureGradleWrapper } from "./gradle-wrapper.js";

/** @import { ProjectConfig, ProjectParams } from "../scripts/types.js"; */

/**
 * @returns {string | undefined}
 */
export function getAndroidPackageName() {
  return "com.microsoft.reacttestapp";
}

/**
 * @param {string} projectRoot
 * @param {Required<ProjectConfig>["android"]} config
 * @returns {ProjectParams["android"] | undefined}
 */
export function configure(
  projectRoot,
  { packageName, sourceDir },
  fs = nodefs
) {
  const manifestPath = path.join(
    "app",
    "build",
    "generated",
    "rnta",
    "src",
    "main",
    "AndroidManifest.xml"
  );
  const appManifestPath = findFile("app.json", projectRoot, fs);
  if (appManifestPath) {
    const output = path.resolve(projectRoot, sourceDir, manifestPath);
    generateAndroidManifest(appManifestPath, output, fs);
  }

  configureGradleWrapper(sourceDir, fs);

  return {
    sourceDir,
    manifestPath,
    packageName: packageName || getAndroidPackageName(),
  };
}
