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
import {
  isMain,
  readJSONFile,
  readTextFile,
  toVersionNumber,
  v,
} from "./helpers.js";

/**
 * @typedef {import("./types").Manifest} Manifest
 */

const VALID_TAGS = ["canary-macos", "canary-windows", "nightly"];

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
  const nodeVersion = Number(major) * 100 + Number(minor);
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
        const npmVersion = Number(major) * 100 + Number(minor);
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
 * Disables [Jetifier](https://developer.android.com/tools/jetifier).
 *
 * Jetifier is only necessary when you depend on code that has not yet migrated
 * to AndroidX. If we only deal with modern code, disabling it makes builds
 * slightly faster.
 */
function disableJetifier() {
  const gradleProperties = "example/android/gradle.properties";
  fs.writeFileSync(
    gradleProperties,
    readTextFile(gradleProperties).replace(
      "android.enableJetifier=true",
      "android.enableJetifier=false"
    )
  );
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
    7: "^0.68.0-0",
    8: "^0.69.0-0",
    9: "^0.70.0-0",
    10: "^0.71.0-0",
    11: "^0.72.0-0",
    12: "^0.73.0-0",
    13: "^0.74.0-0",
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
 * @param {string} v
 * @param {Manifest} manifest
 * @return {Promise<Record<string, string | undefined>>}
 */
async function resolveCommonDependencies(
  v,
  { version, dependencies, peerDependencies }
) {
  const [rnBabelPresetVersion, rnMetroConfigVersion, metroBabelPresetVersion] =
    await (async () => {
      if (["^", "canary", "nightly"].some((tag) => v.includes(tag))) {
        return [v, v, undefined];
      }

      const target = version?.includes("-") ? `^${v}.0-0` : `^${v}`;
      const [
        { version: rnBabelPresetVersion },
        { version: rnMetroConfigVersion },
        { version: metroBabelPresetVersion },
      ] = await Promise.all([
        fetchPackageInfo(`@react-native/babel-preset@${target}`),
        fetchPackageInfo(`@react-native/metro-config@${target}`),
        (async () => {
          // Metro bumps and publishes all packages together, meaning we can use
          // `metro-react-native-babel-transformer` to determine the version of
          // `metro-react-native-babel-preset` that should be used.
          const version =
            dependencies?.["metro-react-native-babel-transformer"];
          if (version) {
            return { version };
          }

          // `metro-react-native-babel-transformer` is no longer a direct dependency
          // of `react-native`. As of 0.72, we should go through
          // `@react-native-community/cli-plugin-metro` instead.
          const cliPluginMetro = "@react-native-community/cli-plugin-metro";
          const metroPluginInfo = await fetchPackageInfo(cliPluginMetro);
          return { version: metroPluginInfo.dependencies?.["metro"] };
        })(),
      ]);
      return [
        rnBabelPresetVersion,
        rnMetroConfigVersion,
        metroBabelPresetVersion,
      ];
    })();

  return {
    "@react-native-community/cli":
      dependencies?.["@react-native-community/cli"],
    "@react-native-community/cli-platform-android":
      dependencies?.["@react-native-community/cli-platform-android"],
    "@react-native-community/cli-platform-ios":
      dependencies?.["@react-native-community/cli-platform-ios"],
    "@react-native/babel-preset": rnBabelPresetVersion,
    "@react-native/metro-config": rnMetroConfigVersion,
    "metro-react-native-babel-preset": metroBabelPresetVersion,
    react: peerDependencies?.["react"],
  };
}

/**
 * Returns a profile for specified version.
 * @param {string} v
 * @param {boolean} coreOnly
 * @return {Promise<Record<string, string | undefined>>}
 */
async function getProfile(v, coreOnly) {
  switch (v) {
    case "canary-macos": {
      const info = await fetchPackageInfo("react-native-macos@canary");
      const coreVersion = inferReactNativeVersion(info);
      const commonDeps = await resolveCommonDependencies(coreVersion, info);
      return {
        ...commonDeps,
        "react-native": coreVersion,
        "react-native-macos": "canary",
        "react-native-windows": undefined,
      };
    }

    case "canary-windows": {
      const info =
        process.env["CI"] || process.env["NUGET_EXE"]
          ? await fetchReactNativeWindowsCanaryInfoViaNuGet()
          : await fetchPackageInfo("react-native-windows@canary");
      const coreVersion = info.peerDependencies?.["react-native"] || "nightly";
      const commonDeps = await resolveCommonDependencies(coreVersion, info);
      return {
        ...commonDeps,
        "react-native": coreVersion,
        "react-native-macos": undefined,
        "react-native-windows": info.version,
      };
    }

    case "nightly": {
      const info = await fetchPackageInfo("react-native@nightly");
      const commonDeps = await resolveCommonDependencies(v, info);
      return {
        ...commonDeps,
        "react-native": "nightly",
        "react-native-macos": undefined,
        "react-native-windows": undefined,
      };
    }

    default: {
      const [reactNative, { version: rnmVersion }, { version: rnwVersion }] =
        await Promise.all([
          fetchPackageInfo(`react-native@^${v}.0-0`),
          coreOnly
            ? Promise.resolve({ version: undefined })
            : fetchPackageInfo(`react-native-macos@^${v}.0-0`),
          coreOnly
            ? Promise.resolve({ version: undefined })
            : fetchPackageInfo(`react-native-windows@^${v}.0-0`),
        ]);
      const commonDeps = await resolveCommonDependencies(v, reactNative);
      return {
        ...commonDeps,
        "react-native": reactNative.version,
        "react-native-macos": rnmVersion,
        "react-native-windows": rnwVersion,
      };
    }
  }
}

/**
 * Sets Gradle Wrapper to specified version.
 * @param {string} version
 */
function setGradleVersion(version) {
  const gradleWrapperProperties =
    "example/android/gradle/wrapper/gradle-wrapper.properties";
  fs.writeFileSync(
    gradleWrapperProperties,
    readTextFile(gradleWrapperProperties).replace(
      /gradle-[.0-9]*-bin\.zip/,
      `gradle-${version}-bin.zip`
    )
  );
}

/**
 * Sets specified React Native version.
 * @param {string} version
 * @param {boolean} coreOnly
 * @return {Promise<void>}
 */
export function setReactVersion(version, coreOnly) {
  return getProfile(version, coreOnly)
    .then((profile) => {
      console.dir(profile, { depth: null });

      const manifests = ["package.json", "example/package.json"];
      for (const manifestPath of manifests) {
        const manifest = /** @type {Manifest} */ (readJSONFile(manifestPath));
        const { dependencies, devDependencies, resolutions = {} } = manifest;
        if (!devDependencies) {
          throw new Error("Expected 'devDependencies' to be declared");
        }

        for (const packageName of keys(profile)) {
          const deps = dependencies?.[packageName]
            ? dependencies
            : devDependencies;
          deps[packageName] = profile[packageName];

          // Reset resolutions so we don't get old packages
          resolutions[packageName] = undefined;
        }

        // Reset resolutions of the nested type e.g.,
        // `@react-native/community-cli-plugin/@react-native-community/cli-server-api`
        for (const pkg of Object.keys(resolutions)) {
          if (pkg.startsWith("@react-native")) {
            resolutions[pkg] = undefined;
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
}

const { [1]: script, [2]: version } = process.argv;
if (isMain(import.meta.url)) {
  if (!(await checkEnvironment())) {
    process.exitCode = 1;
  } else if (!isValidVersion(version)) {
    console.log(
      `Usage: ${path.basename(script)} [<version number> | ${VALID_TAGS.join(" | ")}]`
    );
    process.exitCode = 1;
  } else {
    setReactVersion(version, process.argv.includes("--core-only")).then(() => {
      const numVersion =
        version === "nightly"
          ? Number.MAX_SAFE_INTEGER
          : toVersionNumber(version);
      if (numVersion >= v(0, 74, 0)) {
        disableJetifier();
      } else if (numVersion < v(0, 73, 0)) {
        setGradleVersion("7.6.3");
      }

      // `@react-native-webapis/web-storage` is not compatible with codegen 0.71
      if (numVersion < v(0, 72, 0)) {
        const exampleManifest = "example/package.json";
        fs.writeFileSync(
          exampleManifest,
          readTextFile(exampleManifest).replace(
            /\s+"@react-native-webapis\/web-storage":.*/,
            ""
          )
        );
      }
    });
  }
}
