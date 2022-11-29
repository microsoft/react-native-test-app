#!/usr/bin/env node
// @ts-check
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

/**
 * @template T
 * @param {() => T | null} fn
 * @returns {() => T | null}
 */
function memo(fn) {
  /** @type {T | null} */
  let result;
  return () => {
    if (result === undefined) {
      result = fn();
    }
    return result;
  };
}

/**
 * Invokes `npm`.
 * @param {...string} args
 */
function npm(...args) {
  const { error, stderr, stdout } = spawnSync("npm", args, {
    encoding: "utf-8",
  });
  if (!stdout) {
    if (stderr) {
      console.error(stderr);
    }
    throw error;
  }
  return stdout.trim();
}

/**
 * Invokes `tar xf`.
 * @param {string} archive
 */
function untar(archive) {
  return spawnSync("tar", ["xf", archive], { cwd: path.dirname(archive) });
}

/**
 * Returns the installed `react-native` manifest, if present.
 * @returns {string | null}
 */
const getInstalledReactNativeManifest = memo(() => {
  try {
    const options = { paths: [process.cwd()] };
    return require.resolve("react-native/package.json", options);
  } catch (_) {
    return null;
  }
});

/**
 * Returns the installed `react-native` version, if present.
 * @returns {string | null}
 */
const getInstalledVersion = memo(() => {
  const manifestPath = getInstalledReactNativeManifest();
  if (manifestPath) {
    const { version } = require(manifestPath);
    return version;
  }

  return null;
});

/**
 * Returns the desired `react-native` version.
 *
 * Checks the following in order:
 *
 *   - Command line flag, e.g. `--version 0.70`
 *   - Currently installed `react-native` version
 *   - Latest version from npm
 *
 * @returns {string}
 */
function getVersion() {
  const index = process.argv.lastIndexOf("--version");
  if (index >= 0) {
    return process.argv[index + 1];
  }

  const version = getInstalledVersion();
  if (version) {
    return version;
  }

  return npm("view", "react-native", "version");
}

/**
 * Returns the React Native version and path to the template.
 * @returns {Promise<[string] | [string, string]>}
 */
function getTemplate() {
  return new Promise((resolve, reject) => {
    const version = getVersion();
    if (getInstalledVersion() === version) {
      const rnManifest = getInstalledReactNativeManifest();
      if (rnManifest) {
        resolve([version, path.join(path.dirname(rnManifest), "template")]);
        return;
      }
    }

    // `npm view` may return an array if there are multiple versions matching
    // `version`. If there is only one match, the return type is a string.
    const tarballs = JSON.parse(
      npm("view", "--json", `react-native@${version}`, "dist.tarball")
    );
    const url = Array.isArray(tarballs)
      ? tarballs[tarballs.length - 1]
      : tarballs;

    console.log(`Downloading ${path.basename(url)}...`);

    require("https")
      .get(url, (res) => {
        const fs = require("fs");
        const os = require("os");

        const tmpDir = path.join(os.tmpdir(), "react-native-test-app");
        fs.mkdirSync(tmpDir, { recursive: true });

        const dest = path.join(tmpDir, path.basename(url));
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => {
          file.close();

          untar(dest);

          const template = path.join(tmpDir, "package", "template");
          resolve([version, template]);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

async function main() {
  /**
   * @type {{
   *   name?: string;
   *   packagePath?: string;
   *   platforms?: import("./configure").Platform[];
   * }}
   */
  const { name, packagePath, platforms } = await require("prompts")([
    {
      type: "text",
      name: "name",
      message: "What is the name of your app?",
      initial: "Example",
      validate: Boolean,
    },
    {
      type: "multiselect",
      name: "platforms",
      message: "Which platforms do you need test apps for?",
      choices: [
        { title: "Android", value: "android", selected: true },
        { title: "iOS", value: "ios", selected: true },
        { title: "macOS", value: "macos", selected: true },
        { title: "Windows", value: "windows", selected: true },
      ],
      min: 1,
    },
    {
      type: "text",
      name: "packagePath",
      message: "Where should we create the new project?",
      initial: "example",
      validate: Boolean,
    },
  ]);

  if (!name || !packagePath || !platforms) {
    return 1;
  }

  const { configure } = require("./configure");

  const [targetVersion, templatePath] = await getTemplate();
  return configure({
    name,
    packagePath,
    templatePath,
    testAppPath: path.resolve(__dirname, ".."),
    targetVersion,
    platforms,
    flatten: true,
    force: true,
    init: true,
  });
}

main().then((result) => {
  process.exitCode = result;
});
