// @ts-check
// istanbul ignore file

const { spawnSync } = require("child_process");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { version: targetVersion } = require("react-native/package.json");
const { gatherConfig, writeAllFiles } = require("../../scripts/configure");

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
 * @param {import("../../scripts/configure").ConfigureParams["platforms"]} platforms
 * @param {Record<string, string | string[]>=} setupFiles
 */
async function makeProject(name, platforms, setupFiles = {}) {
  const packagePath = projectPath(name);
  const { files } = gatherConfig({
    name,
    packagePath,
    testAppPath: path.resolve(__dirname, "..", ".."),
    targetVersion,
    platforms,
    flatten: true,
    force: true,
    init: true,
  });

  await writeAllFiles(files, packagePath);

  try {
    await fs.symlink(
      path.resolve(__dirname, "..", "..", "example", "node_modules"),
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
      return fs
        .mkdir(path.dirname(p), { recursive: true })
        .then(() => fs.writeFile(p, joinStrings(content, "\n")));
    })
  );

  return packagePath;
}

/**
 * Removes specified project.
 * @param {string} name
 */
function removeProject(name) {
  fs.rm(projectPath(name), {
    maxRetries: 3,
    recursive: true,
  });
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
 * @param {import("../../scripts/configure").ConfigureParams["platforms"]} platforms
 * @param {Record<string, string | string[]>=} setupFiles
 */
async function runGradleWithProject(name, platforms, setupFiles = {}) {
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

exports.removeProject = removeProject;
exports.runGradleWithProject = runGradleWithProject;
