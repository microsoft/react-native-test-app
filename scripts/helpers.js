// @ts-check
"use strict";

const path = require("path");

/**
 * Finds nearest relative path to a file or directory from current path.
 * @param {string} fileOrDirName Path to the file or directory to find.
 * @param {string=} currentDir The current working directory. Mostly used for unit tests.
 * @returns {string | null} Nearest path to given file or directory; null if not found
 */
function findNearest(
  fileOrDirName,
  currentDir = path.resolve(""),
  fs = require("fs")
) {
  const rootDirectory =
    process.platform === "win32"
      ? currentDir.split(path.sep)[0] + path.sep
      : "/";
  while (currentDir !== rootDirectory) {
    const candidatePath = path.join(currentDir, fileOrDirName);
    if (fs.existsSync(candidatePath)) {
      return path.relative("", candidatePath);
    }

    // Get parent folder
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Reads and parses JSON file at specified path.
 * @param {import("node:fs").PathLike} path
 * @returns {Record<string, unknown>}
 */
function readJSONFile(path, fs = require("fs")) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
}

/**
 * Returns version string of specified module.
 * @param {string} module
 * @returns {string}
 */
function getPackageVersion(
  module,
  startDir = process.cwd(),
  fs = require("fs")
) {
  const options = { paths: [startDir] };
  const manifestPath = require.resolve(`${module}/package.json`, options);
  const mod = readJSONFile(manifestPath, fs);
  const version = mod["version"];
  if (typeof version !== "string") {
    throw new Error(`Invalid version number: ${module}@${version}`);
  }

  return version;
}

/**
 * @template T
 * @param {string[]} dependencyChain
 * @param {string=} startDir
 * @returns {T}
 */
function requireTransitive(dependencyChain, startDir = process.cwd()) {
  const p = dependencyChain.reduce((curr, next) => {
    const p = require.resolve(next + "/package.json", { paths: [curr] });
    return path.dirname(p);
  }, startDir);
  return require(p);
}

exports.findNearest = findNearest;
exports.getPackageVersion = getPackageVersion;
exports.readJSONFile = readJSONFile;
exports.requireTransitive = requireTransitive;
