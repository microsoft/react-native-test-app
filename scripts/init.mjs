#!/usr/bin/env node
// @ts-check
import chalk from "chalk";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as https from "node:https";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import { configure } from "./configure.mjs";
import { npm as npmSync, readJSONFile } from "./helpers.js";
import { parseArgs } from "./parseargs.js";

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
  const { error, stderr, stdout } = npmSync(...args);
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
  const args = ["xf", archive];
  const options = { cwd: path.dirname(archive) };
  const result = spawnSync("tar", args, options);

  // If we run `tar` from Git Bash with a Windows path, it will fail with:
  //
  //     tar: Cannot connect to C: resolve failed
  //
  // GNU Tar assumes archives with a colon in the file name are on another
  // machine. See also
  // https://www.gnu.org/software/tar/manual/html_section/file.html.
  if (
    process.platform === "win32" &&
    result.stderr.toString().includes("tar: Cannot connect to")
  ) {
    args.push("--force-local");
    return spawnSync("tar", args, options);
  }

  return result;
}

/**
 * Returns the installed `react-native` manifest, if present.
 * @returns {string | null}
 */
const getInstalledReactNativeManifest = memo(() => {
  const require = createRequire(import.meta.url);
  const options = { paths: [process.cwd()] };
  try {
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
    const { version } = readJSONFile(manifestPath);
    if (typeof version === "string") {
      return version;
    }
  }

  return null;
});

/**
 * Returns the npm package name for the specified platform.
 * @param {string} platform
 * @returns {string}
 */
function getPackageName(platform) {
  switch (platform) {
    case "android":
    case "ios":
      return "react-native";
    case "macos":
      return "react-native-macos";
    case "windows":
      return "react-native-windows";
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Returns the desired `react-native` version.
 *
 * Checks the following in order:
 *
 *   - Command line flag, e.g. `--version 0.70`
 *   - Currently installed `react-native` version
 *   - Latest version from npm
 *
 * @param {import("./configure.mjs").Platform[]} platforms
 * @returns {string}
 */
function getVersion(platforms) {
  const index = process.argv.lastIndexOf("--version");
  if (index >= 0) {
    return process.argv[index + 1];
  }

  /** @type {(version: string, reason: string) => void} */
  const logVersion = (version, reason) => {
    const fmtVersionFlag = chalk.bold("--version");
    const fmtTarget = chalk.bold(version);
    console.log(
      `Using ${fmtTarget} because ${reason} (use ${fmtVersionFlag} to ` +
        `specify another version)`
    );
  };

  const version = getInstalledVersion();
  if (version) {
    logVersion(version, "the current project uses it");
    return version;
  }

  console.log("No version was specified; fetching available versions...");

  const maxSupportedVersion = platforms.reduce((result, p) => {
    const pkgName = getPackageName(p);
    if (!pkgName) {
      return result;
    }

    const [major, minor] = npm("view", pkgName, "version").split(".");
    const v = Number(major) * 100 + Number(minor);
    return v < result ? v : result;
  }, Number.MAX_VALUE);

  const major = Math.trunc(maxSupportedVersion / 100);
  const minor = maxSupportedVersion % 100;

  const target = `^${major}.${minor}`;
  logVersion(target, "it supports all specified platforms");

  return target;
}

/**
 * Returns the React Native version and path to the template.
 * @param {import("./configure.mjs").Platform[]} platforms
 * @returns {Promise<[string] | [string, string]>}
 */
function getTemplate(platforms) {
  return new Promise((resolve, reject) => {
    const version = getVersion(platforms);
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

    https
      .get(url, (res) => {
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

function main() {
  return new Promise((resolve) => {
    parseArgs(
      "Initializes a new app project from template",
      {
        name: {
          description: "Name of the app",
          type: "string",
        },
        platform: {
          description:
            "Platform to configure; can be specified multiple times e.g., `-p android -p ios`",
          type: "string",
          multiple: true,
          short: "p",
        },
        destination: {
          description: "Destination path for the app",
          type: "string",
        },
        version: {
          description: "React Native version",
          type: "string",
          short: "v",
        },
      },
      async (args) => {
        prompts.override({
          name: args.name,
          platforms:
            typeof args.platform === "string" ? [args.platform] : args.platform,
          packagePath: args.destination,
        });

        /**
         * @type {{
         *   name?: string;
         *   packagePath?: string;
         *   platforms?: import("./configure.mjs").Platform[];
         * }}
         */
        const { name, packagePath, platforms } = await prompts([
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
          resolve(1);
          return;
        }

        const [targetVersion, templatePath] = await getTemplate(platforms);
        const result = configure({
          name,
          packagePath,
          templatePath,
          testAppPath: fileURLToPath(new URL("..", import.meta.url)),
          targetVersion,
          platforms,
          flatten: true,
          force: true,
          init: true,
        });

        resolve(result);
      }
    );
  });
}

main().then((result) => {
  process.exitCode = result;
});
