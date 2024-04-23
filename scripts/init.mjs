#!/usr/bin/env node
// @ts-check
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as https from "node:https";
import { createRequire } from "node:module";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import * as colors from "./colors.mjs";
import { configure, getDefaultPlatformPackageName } from "./configure.mjs";
import { fetchPackageMetadata, memo, readJSONFile } from "./helpers.js";
import { parseArgs } from "./parseargs.mjs";

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
 * Fetches the tarball URL for the specified package and version.
 * @param {string} pkg
 * @param {string} version
 * @returns {Promise<string>}
 */
async function fetchPackageTarballURL(pkg, version) {
  const info = await fetchPackageMetadata(pkg);
  const specific = info.versions[version];
  if (specific) {
    return specific.dist.tarball;
  }

  const versions = Object.keys(info.versions);
  for (let i = versions.length - 1; i >= 0; --i) {
    const v = versions[i];
    if (v.startsWith(version)) {
      return info.versions[v].dist.tarball;
    }
  }

  throw new Error(`No match found for '${pkg}@${version}'`);
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
 * Returns the desired `react-native` version.
 *
 * Checks the following in order:
 *
 *   - Command line flag, e.g. `--version 0.70`
 *   - Currently installed `react-native` version
 *   - Latest version from npm
 *
 * @param {import("./types").Platform[]} platforms
 * @returns {Promise<string>}
 */
async function getVersion(platforms) {
  const index = process.argv.lastIndexOf("--version");
  if (index >= 0) {
    const m = process.argv[index + 1].match(/(\d+\.\d+[-.0-9a-z]*)/);
    if (!m) {
      throw new Error(
        "Expected version number of the form <major>.<minor>.<patch>-<prerelease> (where patch and prerelease are optional)"
      );
    }
    return m[1];
  }

  /** @type {(version: string, reason: string) => void} */
  const logVersion = (version, reason) => {
    const bVersionFlag = colors.bold("--version");
    const bTarget = colors.bold(version);
    console.log(
      `Using ${bTarget} because ${reason} (use ${bVersionFlag} to specify another version)`
    );
  };

  const version = getInstalledVersion();
  if (version) {
    logVersion(version, "the current project uses it");
    return version;
  }

  console.log("No version was specified; fetching available versions...");

  let maxSupportedVersion = Number.MAX_VALUE;
  for (const p of platforms) {
    const pkgName = getDefaultPlatformPackageName(p);
    if (!pkgName) {
      continue;
    }

    const info = await fetchPackageMetadata(pkgName, "latest");
    const [major, minor] = info.version.split(".");
    const v = Number(major) * 1000 + Number(minor);
    if (v < maxSupportedVersion) {
      maxSupportedVersion = v;
    }
  }

  const major = Math.trunc(maxSupportedVersion / 1000);
  const minor = maxSupportedVersion % 1000;

  const target = major + "." + minor;
  logVersion(target, "it supports all specified platforms");

  return target;
}

/**
 * Returns the React Native version and path to the template.
 * @param {import("./types").Platform[]} platforms
 * @returns {Promise<[string] | [string, string]>}
 */
async function fetchTemplate(platforms) {
  const version = await getVersion(platforms);
  if (getInstalledVersion() === version) {
    const rnManifest = getInstalledReactNativeManifest();
    if (rnManifest) {
      return [version, path.join(path.dirname(rnManifest), "template")];
    }
  }

  const url = await fetchPackageTarballURL("react-native", version);
  console.log(`Downloading ${path.basename(url)}...`);

  return new Promise((resolve, reject) => {
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
      .on("error", (err) => reject(err));
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
         *   platforms?: import("./types").Platform[];
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
              {
                title: "visionOS (Experimental)",
                value: "visionos",
                selected: false,
              },
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

        const [targetVersion, templatePath] = await fetchTemplate(platforms);
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
