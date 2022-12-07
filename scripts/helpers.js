// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Finds nearest relative path to a file or directory from current path.
 * @param {string} fileOrDirName Path to the file or directory to find.
 * @param {string=} currentDir The current working directory. Mostly used for unit tests.
 * @returns {string | null} Nearest path to given file or directory; null if not found
 */
function findNearest(fileOrDirName, currentDir = path.resolve("")) {
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
 * @param {fs.PathLike} path
 * @returns {Record<string, unknown>}
 */
function readJSONFile(path) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf-8" }));
}

/**
 * Returns version string of specified module.
 * @param {string} module
 * @returns {string}
 */
function getPackageVersion(module, startDir = process.cwd()) {
  const options = { paths: [startDir] };
  const mod = readJSONFile(require.resolve(`${module}/package.json`, options));
  const version = mod["version"];
  if (typeof version !== "string") {
    throw new Error(`Invalid version number: ${module}@${version}`);
  }

  return version;
}

exports.findNearest = findNearest;
exports.getPackageVersion = getPackageVersion;
exports.readJSONFile = readJSONFile;
