#!/usr/bin/env node
// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { readJSONFile } from "./helpers.js";

/**
 * @typedef {{
 *   version?: string;
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
 * }} Manifest
 */

const VALID_TAGS = ["canary-macos", "canary-windows", "main", "nightly"];
const REACT_NATIVE_VERSIONS = {
  "canary-macos": "^0.68",
};

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
 * Fetches the latest package information.
 * @param {string} pkg
 * @return {Promise<Manifest>}
 */
export function fetchPackageInfo(pkg) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const npmView =
      os.platform() === "win32"
        ? spawn(
            "cmd.exe",
            ["/d", "/s", "/c", cmdEscape(`"npm view --json ${pkg}"`)],
            { windowsVerbatimArguments: true }
          )
        : spawn("npm", ["view", "--json", pkg]);
    npmView.stdout.on("data", (data) => {
      buffers.push(data);
    });
    npmView.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject();
      } else if (buffers.length === 0) {
        resolve({
          version: undefined,
          dependencies: {},
          peerDependencies: {},
        });
      } else {
        const json = Buffer.concat(buffers).toString().trim();
        const result = JSON.parse(json);
        if (Array.isArray(result)) {
          // If there are multiple packages matching the version range, pick
          // the last (latest) one.
          resolve(result[result.length - 1]);
        } else {
          resolve(result);
        }
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
 * @param {Manifest["dependencies"]} dependencies
 * @param {Manifest["peerDependencies"]} peerDependencies
 * @return {Record<string, string | undefined>}
 */
function pickCommonDependencies(dependencies, peerDependencies) {
  return {
    "@react-native-community/cli":
      dependencies?.["@react-native-community/cli"],
    "@react-native-community/cli-platform-android":
      dependencies?.["@react-native-community/cli-platform-android"],
    "@react-native-community/cli-platform-ios":
      dependencies?.["@react-native-community/cli-platform-ios"],
    "hermes-engine": dependencies?.["hermes-engine"],
    "metro-react-native-babel-preset":
      dependencies?.["metro-react-native-babel-transformer"],
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
      const { dependencies, peerDependencies } = await fetchPackageInfo(
        "react-native-macos@canary"
      );
      return {
        ...pickCommonDependencies(dependencies, peerDependencies),
        "react-native": REACT_NATIVE_VERSIONS[v],
        "react-native-macos": "canary",
        "react-native-windows": undefined,
      };
    }

    case "canary-windows": {
      const { version, dependencies, peerDependencies } =
        process.env["CI"] || process.env["NUGET_EXE"]
          ? await fetchReactNativeWindowsCanaryInfoViaNuGet()
          : await fetchPackageInfo("react-native-windows@canary");
      return {
        ...pickCommonDependencies(dependencies, peerDependencies),
        "react-native": peerDependencies?.["react-native"] || "^0.0.0-0",
        "react-native-macos": undefined,
        "react-native-windows": version,
      };
    }

    case "main": {
      const { dependencies, peerDependencies } = await fetchPackageInfo(
        "react-native@nightly"
      );
      if (!dependencies) {
        throw new Error("Could not determine dependencies");
      }

      const codegen = await fetchPackageInfo(
        "react-native-codegen@" + dependencies["react-native-codegen"]
      );
      return {
        ...pickCommonDependencies(dependencies, peerDependencies),
        ...codegen.dependencies,
        "react-native": "facebook/react-native",
        "react-native-macos": undefined,
        "react-native-windows": undefined,
      };
    }

    case "nightly": {
      const { dependencies, peerDependencies } = await fetchPackageInfo(
        "react-native@nightly"
      );
      return {
        ...pickCommonDependencies(dependencies, peerDependencies),
        "react-native": "nightly",
        "react-native-macos": undefined,
        "react-native-windows": undefined,
      };
    }

    default: {
      const [
        { version: rnVersion, dependencies, peerDependencies },
        { version: rnmVersion },
        { version: rnwVersion },
      ] = await Promise.all([
        fetchPackageInfo(`react-native@^${v}.0-0`),
        fetchPackageInfo(`react-native-macos@^${v}.0-0`),
        fetchPackageInfo(`react-native-windows@^${v}.0-0`),
      ]);
      return {
        ...pickCommonDependencies(dependencies, peerDependencies),
        "react-native": rnVersion,
        "react-native-macos": rnmVersion,
        "react-native-windows": rnwVersion,
      };
    }
  }
}

const { [2]: version } = process.argv;
if (!isValidVersion(version)) {
  const script = path.basename(fileURLToPath(import.meta.url));
  console.log(
    `Usage: ${script} [<version number> | ${VALID_TAGS.join(" | ")}]`
  );
  process.exit(1);
}

(async () => {
  const profile = await getProfile(version);
  console.log(profile);

  const manifests = ["package.json", "example/package.json"];
  for (const manifestPath of manifests) {
    const manifest = /** @type {{ devDependencies: Record<string, string | undefined>}} */ (
      readJSONFile(manifestPath)
    );
    for (const packageName of keys(profile)) {
      const version = profile[packageName];
      manifest["devDependencies"][packageName] = version;
    }

    const tmpFile = `${manifestPath}.tmp`;
    await fs.writeFile(
      tmpFile,
      JSON.stringify(manifest, undefined, 2) + os.EOL
    );
    await fs.rename(tmpFile, manifestPath);
  }
})();
