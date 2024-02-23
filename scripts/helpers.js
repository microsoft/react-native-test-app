// @ts-check
"use strict";

const { spawnSync } = require("node:child_process");
const nodefs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

/**
 * Escapes given string for use in Command Prompt.
 * @param {string} str
 * @returns {string}
 */
function cmdEscape(str) {
  return str.replace(/([\^])/g, "^^^$1");
}

/**
 * Finds nearest relative path to a file or directory from current path.
 * @param {string} fileOrDirName Path to the file or directory to find.
 * @param {string=} currentDir The current working directory. Mostly used for unit tests.
 * @returns {string | null} Nearest path to given file or directory; null if not found
 */
function findNearest(
  fileOrDirName,
  currentDir = path.resolve(""),
  fs = nodefs
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
 * Invokes `npm` on the command line.
 * @param {...string} args
 */
function npm(...args) {
  switch (os.platform()) {
    case "win32": {
      return spawnSync(
        "cmd.exe",
        ["/d", "/s", "/c", `"npm ${args.map(cmdEscape).join(" ")}"`],
        {
          encoding: "utf-8",
          windowsVerbatimArguments: true,
        }
      );
    }
    default:
      return spawnSync("npm", args, { encoding: "utf-8" });
  }
}

/**
 * Reads text file at specified path.
 * @param {import("node:fs").PathLike} path
 * @returns {string}
 */
function readTextFile(path, fs = nodefs) {
  return fs.readFileSync(path, { encoding: "utf-8" });
}

/**
 * Reads and parses JSON file at specified path.
 * @template [T = Record<string, unknown>]
 * @param {import("node:fs").PathLike} path
 * @returns {T}
 */
function readJSONFile(path, fs = nodefs) {
  return JSON.parse(readTextFile(path, fs));
}

/**
 * Returns version string of specified module.
 * @param {string} module
 * @returns {string}
 */
function getPackageVersion(module, startDir = process.cwd(), fs = nodefs) {
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

/**
 * Returns the numerical value equivalent of the specified version string.
 * @param {string} version
 * @returns {number}
 */
function toVersionNumber(version) {
  const [major, minor = 0, patch = 0] = version.split("-")[0].split(".");
  return v(Number(major), Number(minor), Number(patch));
}

/**
 * Returns the numerical value of the individual version identifiers combined.
 * @param {number} major
 * @param {number} minor
 * @param {number} patch
 * @returns {number}
 */
function v(major, minor, patch) {
  return major * 1000000 + minor * 1000 + patch;
}

exports.findNearest = findNearest;
exports.getPackageVersion = getPackageVersion;
exports.npm = npm;
exports.readJSONFile = readJSONFile;
exports.readTextFile = readTextFile;
exports.requireTransitive = requireTransitive;
exports.toVersionNumber = toVersionNumber;
exports.v = v;
