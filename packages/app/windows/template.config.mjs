// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { readTextFile } from "../scripts/helpers.js";
import { findGitIgnore } from "../scripts/template.mjs";

/**
 * @import {
 *   Configuration,
 *   ConfigureParams,
 *   ProjectConfig,
 *   ProjectParams,
 * } from "../scripts/types.js";
 */

/**
 * @param {string} solutionFile
 * @returns {ProjectParams["windows"]["project"]}
 */
function windowsProjectPath(solutionFile, fs = nodefs) {
  const sln = readTextFile(solutionFile, fs);
  const m = sln.match(
    /([^"]*?node_modules[/\\].generated[/\\]windows[/\\].*?\.vcxproj)/
  );
  return { projectFile: m ? m[1] : `(Failed to parse '${solutionFile}')` };
}

/**
 * @param {string} _projectRoot
 * @param {Required<ProjectConfig>["windows"]} config
 * @returns {ProjectParams["windows"] | undefined}
 */
export function configure(
  _projectRoot,
  { sourceDir, solutionFile },
  fs = nodefs
) {
  return fs.existsSync(solutionFile)
    ? {
        sourceDir,
        solutionFile: path.relative(sourceDir, solutionFile),
        project: windowsProjectPath(solutionFile, fs),
      }
    : undefined;
}

/**
 * @param {ConfigureParams} params
 * @returns {Configuration}
 */
export function getTemplate({ name, testAppPath }, fs = nodefs) {
  const windowsDir = path.join(testAppPath, "example", "windows");
  return {
    files: {
      ".gitignore": findGitIgnore(windowsDir, fs),
    },
    oldFiles: [
      `${name}.sln`,
      `${name}.vcxproj`,
      path.join(name, `${name}.vcxproj`),
    ],
    scripts: {
      "build:windows":
        "react-native bundle --entry-file index.js --platform windows --dev true --bundle-output dist/main.windows.bundle --assets-dest dist",
      windows: "react-native run-windows",
    },
    dependencies: {},
  };
}
