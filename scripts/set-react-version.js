#!/usr/bin/env node
//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

const { spawn } = require("child_process");
const os = require("os");

/**
 * @typedef {{
 *   version?: string;
 *   dependencies: Record<string, string>;
 *   peerDependencies: Record<string, string>;
 * }} Manifest
 */

const VALID_TAGS = ["canary-macos", "canary-windows", "main", "nightly"];
const REACT_NATIVE_VERSIONS = {
  "canary-macos": "^0.64",
  "canary-windows": "^0.67.0-0",
};

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
 * @template T
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
function fetchPackageInfo(pkg) {
  return new Promise((resolve) => {
    /** @type {string[]} */
    const result = [];

    const npm = os.platform() === "win32" ? "npm.cmd" : "npm";
    const fetch = spawn(npm, ["view", "--json", pkg]);
    fetch.stdout.on("data", (data) => {
      result.push(data);
    });
    fetch.on("close", (code) => {
      if (code !== 0 || result.length === 0) {
        resolve({
          version: undefined,
          dependencies: {},
          peerDependencies: {},
        });
      } else {
        const list = JSON.parse(result.join(""));
        const latest = Array.isArray(list) ? list[list.length - 1] : list;
        resolve({
          version: latest.version,
          dependencies: latest.dependencies,
          peerDependencies: latest.peerDependencies,
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
    const list = spawn("nuget.exe", [
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
    "@react-native-community/cli": dependencies["@react-native-community/cli"],
    "@react-native-community/cli-platform-android":
      dependencies["@react-native-community/cli-platform-android"],
    "@react-native-community/cli-platform-ios":
      dependencies["@react-native-community/cli-platform-ios"],
    "hermes-engine": dependencies["hermes-engine"],
    react: peerDependencies["react"],
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
      const { version, dependencies, peerDependencies } = process.env["CI"]
        ? await fetchReactNativeWindowsCanaryInfoViaNuGet()
        : await fetchPackageInfo("react-native-windows@canary");
      return {
        ...pickCommonDependencies(dependencies, peerDependencies),
        "react-native": REACT_NATIVE_VERSIONS[v],
        "react-native-macos": undefined,
        "react-native-windows": version,
      };
    }

    case "main": {
      const { dependencies, peerDependencies } = await fetchPackageInfo(
        "react-native@nightly"
      );
      return {
        ...pickCommonDependencies(dependencies, peerDependencies),
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
  const script = require("path").basename(__filename);
  console.log(
    `Usage: ${script} [<version number> | ${VALID_TAGS.join(" | ")}]`
  );
  process.exit(1);
}

(async () => {
  const profile = await getProfile(version);
  console.log(profile);

  const fs = require("fs");

  ["package.json", "example/package.json"].forEach((manifestPath) => {
    const content = fs.readFileSync(manifestPath, { encoding: "utf-8" });
    const manifest = JSON.parse(content);
    keys(profile).forEach((packageName) => {
      manifest["devDependencies"][packageName] = profile[packageName];
    });

    const tmpFile = `${manifestPath}.tmp`;
    fs.writeFile(
      tmpFile,
      JSON.stringify(manifest, undefined, 2) + os.EOL,
      (err) => {
        if (err) {
          throw err;
        }

        fs.rename(tmpFile, manifestPath, (err) => {
          if (err) {
            throw err;
          }
        });
      }
    );
  });
})();
