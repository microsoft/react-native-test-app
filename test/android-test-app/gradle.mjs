// @ts-check
/* node:coverage disable */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { gatherConfig, writeAllFiles } from "../../scripts/configure.mjs";
import { findNearest, readJSONFile } from "../../scripts/helpers.js";

/**
 * Joins the strings if an array is passed, otherwise returns the string.
 * @param {string | string[]} strings
 * @returns
 */
function joinStrings(strings, separator = "") {
  return Array.isArray(strings) ? strings.join(separator) : strings;
}

/**
 * Returns project path given name.
 * @param {string} name
 */
function projectPath(name) {
  return `.android-test-${name}`;
}

/**
 * Initializes a React Native project.
 * @param {string} name
 * @param {import("../../scripts/types").ConfigureParams["platforms"]} platforms
 * @param {Record<string, string | string[]>=} setupFiles
 */
async function makeProject(name, platforms, setupFiles = {}) {
  const packagePath = projectPath(name);
  const { files } = gatherConfig({
    name,
    packagePath,
    testAppPath: fileURLToPath(new URL("../..", import.meta.url)),
    targetVersion: reactNativeVersion(),
    platforms,
    flatten: true,
    force: true,
    init: true,
  });

  await writeAllFiles(files, packagePath);

  try {
    await fsp.symlink(
      fileURLToPath(new URL("../../example/node_modules", import.meta.url)),
      path.join(packagePath, "node_modules"),
      "dir"
    );
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code !== "EEXIST") {
      throw e;
    }
  }

  await Promise.all(
    Object.entries(setupFiles).map(([filename, content]) => {
      const p = path.join(packagePath, filename);
      return fsp
        .mkdir(path.dirname(p), { recursive: true })
        .then(() => fsp.writeFile(p, joinStrings(content, "\n")));
    })
  );

  return packagePath;
}

export function reactNativeVersion() {
  const rnPath = findNearest("node_modules/react-native/package.json");
  if (!rnPath) {
    throw new Error("Cannot find module 'react-native'");
  }

  const { version } = readJSONFile(rnPath);
  if (typeof version !== "string") {
    throw new Error(`Invalid version string for 'react-native': ${version}`);
  }

  return version;
}

/**
 * Removes specified project.
 * @param {string} name
 */
export function removeProject(name) {
  /** @type {(err?: Error | null) => void} */
  const rethrow = (err) => {
    if (err) {
      throw err;
    }
  };
  fs.rm(projectPath(name), { maxRetries: 3, recursive: true }, rethrow);
}

/**
 * Runs Gradle in specified directory.
 * @param {string} cwd
 * @param  {...string} args arguments
 * @returns
 */
function runGradle(cwd, ...args) {
  const gradlew = os.platform() === "win32" ? "gradlew.bat" : "./gradlew";
  return spawnSync(gradlew, args, { cwd, encoding: "utf-8" });
}

/**
 * Initializes a new React Native project and runs Gradle.
 * @param {string} name
 * @param {import("../../scripts/types").ConfigureParams["platforms"]} platforms
 * @param {Record<string, string | string[]>=} setupFiles
 */
export async function runGradleWithProject(name, platforms, setupFiles = {}) {
  const projectPath = await makeProject(name, platforms, setupFiles);
  const result = runGradle(projectPath);
  const stdout = joinStrings(result.stdout);
  const stderr = joinStrings(result.stderr);
  if (result.stderr) {
    console.log(stdout);
    console.error(stderr);
  }
  return { ...result, stdout, stderr };
}
