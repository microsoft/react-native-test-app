#!/usr/bin/env node
// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readJSONFile } from "./helpers.js";

/**
 * @typedef {{
 *   name?: string;
 *   version?: string;
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 * }} Manifest
 */

const VALID_TAGS = ["canary-macos", "canary-windows", "main", "nightly"];

/**
 * Escapes given string for use in Command Prompt.
 * @param {string} str
 * @returns
 */
function cmdEscape(str) {
  return str.replace(/([\^])/g, "^^^$1");
}

/**
 * Returns whether specified string is a valid version number.
 * @param {string} v
 * @return {boolean}
 */
function isValidVersion(v) {
  return /^\d+\.\d+$/.test(v) || VALID_TAGS.includes(v);
}

/**
 * Type-safe `Object.keys()`
 * @template {Record<string, unknown>} T
 * @param {T} obj
 * @returns {(keyof T)[]}
 */
function keys(obj) {
  return /** @type {(keyof T)[]} */ (Object.keys(obj));
}

/**
 * @param {string} args
 */
function npm(args) {
  return os.platform() === "win32"
    ? spawn("cmd.exe", ["/d", "/s", "/c", cmdEscape(`"npm ${args}"`)], {
        windowsVerbatimArguments: true,
      })
    : spawn("npm", args.split(" "));
}

async function checkEnvironment() {
  // Make sure we use Node 18.14+ and npm 9.3+ as they contain breaking changes.
  // See https://nodejs.org/en/blog/release/v18.14.0.

  const [major, minor] = process.versions.node.split(".");
  const nodeVersion = Number.parseInt(major) * 100 + Number.parseInt(minor);
  if (nodeVersion < 1814) {
    console.error("Node.js v18.14 or greater is required");
    return false;
  }

  try {
    await new Promise((resolve, reject) => {
      const npmVersion = npm("--version");

      /** @type {Buffer[]} */
      const npmVersionBuffer = [];

      npmVersion.stdout.on("data", (data) => {
        npmVersionBuffer.push(data);
      });
      npmVersion.on("close", () => {
        const version = Buffer.concat(npmVersionBuffer).toString().trim();
        const [major, minor] = version.split(".");
        const npmVersion =
          Number.parseInt(major) * 100 + Number.parseInt(minor);
        if (npmVersion < 903) {
          reject();
        } else {
          resolve(true);
        }
      });
    });
  } catch (e) {
    console.error("npm v9.3.1 or greater is required");
    return false;
  }

  return true;
}

/**
 * Infer the React Native version an out-of-tree platform package is based on.
 * @param {Manifest} manifest
 * @returns {string}
 */
function inferReactNativeVersion({ name, version, dependencies }) {
  const cliPackage = "@react-native-community/cli";
  const cliVersion = dependencies?.[cliPackage];
  if (!cliVersion) {
    throw new Error(
      `Unable to determine the react-native version that ${name}@${version} is based on`
    );
  }

  const m = cliVersion.match(/[^\d]*([\d]+)/);
  if (!m) {
    throw new Error(`Invalid '${cliPackage}' version number: ${cliVersion}`);
  }

  const v = {
    7: "^0.68",
    8: "^0.69",
    9: "^0.70",
    10: "^0.71",
    11: "^0.72",
    12: "^0.73",
  }[m[1]];
  if (!v) {
    throw new Error(`Unsupported '${cliPackage}' version: ${cliVersion}`);
  }

  return v;
}

/**
 * Fetches the latest package information.
 * @param {string} pkg
 * @return {Promise<Manifest>}
 */
export function fetchPackageInfo(pkg) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const buffers = [];

    const npmView = npm(`view --json ${pkg}`);
    npmView.stdout.on("data", (data) => {
      buffers.push(data);
    });
    npmView.on("close", (exitCode) => {
      if (buffers.length > 0) {
        const json = Buffer.concat(buffers).toString().trim();
        const result = JSON.parse(json);
        if (result.error) {
          if (result.error.code === "E404") {
            resolve({
              version: undefined,
              dependencies: {},
              peerDependencies: {},
            });
          } else {
            reject(result.error);
          }
        } else if (Array.isArray(result)) {
          // If there are multiple packages matching the version range, pick
          // the last (latest) one.
          resolve(result[result.length - 1]);
        } else {
          resolve(result);
        }
      } else if (exitCode !== 0) {
        reject(new Error(`Failed to fetch registry info for '${pkg}'`));
      } else {
        resolve({
          version: undefined,
          dependencies: {},
          peerDependencies: {},
        });
      }
    });
  });
}

/**
 * Fetches the latest react-native-windows@canary information via NuGet.
 * @return {Promise<Manifest>}
 */
function fetchReactNativeWindowsCanaryInfoViaNuGet() {
  return new Promise((resolve) => {
    const pattern = /Microsoft\.ReactNative\.Cxx ([-.\d]*canary[-.\d]*)/;

    let isResolved = false;
    const list = spawn(process.env["NUGET_EXE"] || "nuget.exe", [
      "list",
      "Microsoft.ReactNative.Cxx",
      "-Source",
      "https://pkgs.dev.azure.com/ms/react-native/_packaging/react-native-public/nuget/v3/index.json",
      "-AllVersions",
      "-Prerelease",
    ]);
    list.stdout.on("data", (data) => {
      if (isResolved) {
        return;
      }

      const m = data.toString().match(pattern);
      if (!m) {
        return;
      }

      isResolved = true;
      resolve(`react-native-windows@${m[1]}`);

      list.kill();
    });
  }).then(fetchPackageInfo);
}

/**
 * Returns an object with common dependencies.
 * @param {Manifest} manifest
 * @return {Promise<Record<string, string | undefined>>}
 */
async function resolveCommonDependencies({ dependencies, peerDependencies }) {
  return {
    "@react-native-community/cli":
      dependencies?.["@react-native-community/cli"],
    "@react-native-community/cli-platform-android":
      dependencies?.["@react-native-community/cli-platform-android"],
    "@react-native-community/cli-platform-ios":
      dependencies?.["@react-native-community/cli-platform-ios"],
    "hermes-engine": dependencies?.["hermes-engine"],
    "metro-react-native-babel-preset": await (async () => {
      // Metro bumps and publishes all packages together, meaning we can use
      // `metro-react-native-babel-transformer` to determine the version of
      // `metro-react-native-babel-preset` that should be used.
      const version = dependencies?.["metro-react-native-babel-transformer"];
      if (version) {
        return version;
      }

      // `metro-react-native-babel-transformer` is no longer a direct dependency
      // of `react-native`. As of 0.72, we should go through
      // `@react-native-community/cli-plugin-metro` instead.
      const cliPluginMetro = "@react-native-community/cli-plugin-metro";
      const metroPluginInfo = await fetchPackageInfo(cliPluginMetro);
      return metroPluginInfo.dependencies?.["metro"];
    })(),
    react: peerDependencies?.["react"],
  };
}

/**
 * Returns a profile for specified version.
 * @param {string} v
 * @return {Promise<Record<string, string | undefined>>}
 */
async function getProfile(v) {
  switch (v) {
    case "canary-macos": {
      const info = await fetchPackageInfo("react-native-macos@canary");
      const commonDeps = await resolveCommonDependencies(info);
      return {
        ...commonDeps,
        "react-native": inferReactNativeVersion(info),
        "react-native-macos": "canary",
        "react-native-windows": undefined,
      };
    }

    case "canary-windows": {
      const info =
        process.env["CI"] || process.env["NUGET_EXE"]
          ? await fetchReactNativeWindowsCanaryInfoViaNuGet()
          : await fetchPackageInfo("react-native-windows@canary");
      const commonDeps = await resolveCommonDependencies(info);
      return {
        ...commonDeps,
        "react-native": info.peerDependencies?.["react-native"] || "^0.0.0-0",
        "react-native-macos": undefined,
        "react-native-windows": info.version,
      };
    }

    case "main": {
      const info = await fetchPackageInfo("react-native@nightly");
      const { dependencies } = info;
      if (!dependencies) {
        throw new Error("Could not determine dependencies");
      }

      const commonDeps = await resolveCommonDependencies(info);
      const codegen = await fetchPackageInfo(
        "react-native-codegen@" + dependencies["react-native-codegen"]
      );
      return {
        ...commonDeps,
        ...codegen.dependencies,
        "react-native": "facebook/react-native",
        "react-native-macos": undefined,
        "react-native-windows": undefined,
      };
    }

    case "nightly": {
      const info = await fetchPackageInfo("react-native@nightly");
      const commonDeps = await resolveCommonDependencies(info);
      return {
        ...commonDeps,
        "@react-native/metro-config": "latest",
        "react-native": "nightly",
        "react-native-macos": undefined,
        "react-native-windows": undefined,
      };
    }

    default: {
      const coreOnly = process.argv.includes("--core-only");
      const [
        { version: rnMetroConfig },
        reactNative,
        { version: rnmVersion },
        { version: rnwVersion },
      ] = await Promise.all([
        fetchPackageInfo(`@react-native/metro-config@^${v}.0-0`),
        fetchPackageInfo(`react-native@^${v}.0-0`),
        coreOnly
          ? Promise.resolve({ version: undefined })
          : fetchPackageInfo(`react-native-macos@^${v}.0-0`),
        coreOnly
          ? Promise.resolve({ version: undefined })
          : fetchPackageInfo(`react-native-windows@^${v}.0-0`),
      ]);
      const commonDeps = await resolveCommonDependencies(reactNative);
      return {
        ...commonDeps,
        "@react-native/metro-config": rnMetroConfig,
        "react-native": reactNative.version,
        "react-native-macos": rnmVersion,
        "react-native-windows": rnwVersion,
      };
    }
  }
}

if (!(await checkEnvironment())) {
  process.exit(1);
}

const { [2]: version } = process.argv;
if (!isValidVersion(version)) {
  const script = path.basename(fileURLToPath(import.meta.url));
  console.log(
    `Usage: ${script} [<version number> | ${VALID_TAGS.join(" | ")}]`
  );
  process.exit(1);
}

getProfile(version)
  .then((profile) => {
    console.dir(profile, { depth: null });

    const manifests = ["package.json", "example/package.json"];
    for (const manifestPath of manifests) {
      const manifest =
        /** @type {{ devDependencies: Record<string, string | undefined>; resolutions?: Record<string, string | undefined>; }} */ (
          readJSONFile(manifestPath)
        );
      for (const packageName of keys(profile)) {
        const version = profile[packageName];
        manifest["devDependencies"][packageName] = version;
      }

      // Reset resolutions so we don't get old packages
      const resolutions = manifest["resolutions"];
      if (resolutions) {
        for (const pkg of Object.keys(resolutions)) {
          if (
            pkg.startsWith("@react-native-community/cli") ||
            pkg.startsWith("metro")
          ) {
            resolutions[pkg] = undefined;
          }
        }
      }

      const tmpFile = `${manifestPath}.tmp`;
      fs.writeFileSync(
        tmpFile,
        JSON.stringify(manifest, undefined, 2) + os.EOL
      );
      fs.renameSync(tmpFile, manifestPath);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
