// @ts-check
"use strict";

const nodefs = require("node:fs");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const npmRegistryBaseURL = "https://registry.npmjs.org/";

/**
 * Fetches package metadata from the npm registry.
 * @param {string} pkg
 * @param {string=} distTag
 */
function fetchPackageMetadata(pkg, distTag) {
  const init = {
    headers: {
      Accept:
        "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
    },
  };
  const url = distTag
    ? npmRegistryBaseURL + pkg + "/" + distTag
    : npmRegistryBaseURL + pkg;
  return fetch(url, init).then((res) => res.json());
}

/**
 * Finds the specified file using Node module resolution.
 * @param {string} file
 * @param {string=} startDir
 * @returns {string | undefined}
 */
function findFile(file, startDir = process.cwd(), fs = nodefs) {
  let currentDir = startDir;
  let candidate = path.join(currentDir, file);
  while (!fs.existsSync(candidate)) {
    const nextDir = path.dirname(currentDir);
    if (nextDir === currentDir) {
      return undefined;
    }

    currentDir = nextDir;
    candidate = path.join(currentDir, file);
  }

  return candidate;
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
  const result = findFile(fileOrDirName, currentDir, fs);
  return result ? path.relative("", result) : null;
}

/**
 * Returns whether the current module is main.
 * @param {string} url
 * @param {string} script
 * @returns {boolean}
 */
function isMain(url, script = process.argv[1]) {
  return Boolean(
    url && script && fileURLToPath(url) === require.resolve(script)
  );
}

/**
 * @template T
 * @param {(...args: any[]) => T} fn
 * @returns {(...args: any[]) => T}
 */
function memo(fn) {
  /** @type {T} */
  let result;
  return (...args) => {
    if (result === undefined) {
      result = fn(...args);
    }
    return result;
  };
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

/**
 * Writes data to specified file path.
 * @param {string} file
 * @param {string} data
 * @returns {Promise<void>}
 */
function writeTextFile(file, data, fs = nodefs.promises) {
  return fs.writeFile(file, data, { encoding: "utf-8", mode: 0o644 });
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

exports.fetchPackageMetadata = fetchPackageMetadata;
exports.findFile = findFile;
exports.findNearest = findNearest;
exports.getPackageVersion = getPackageVersion;
exports.isMain = isMain;
exports.memo = memo;
exports.npmRegistryBaseURL = npmRegistryBaseURL;
exports.readJSONFile = readJSONFile;
exports.readTextFile = readTextFile;
exports.requireTransitive = requireTransitive;
exports.toVersionNumber = toVersionNumber;
exports.v = v;
exports.writeTextFile = writeTextFile;
