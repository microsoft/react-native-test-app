// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as util from "node:util";
import {
  isMain,
  readJSONFile,
  readTextFile,
  toVersionNumber,
  v,
} from "../helpers.js";
import { fetchPackageMetadata, npmRegistryBaseURL } from "../utils/npm.mjs";

/** @typedef {import("../types.js").Manifest} Manifest */
/**
 * @template T
 * @typedef {{ [P in keyof T]: Required<NonNullable<T[P]>> }} RequiredObject<T>
 */

const VALID_TAGS = ["canary-macos", "canary-windows", "nightly"];

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
 * @param {string} filename
 * @param {string | RegExp} searchValue
 * @param {string} replaceValue
 * @returns {Promise<void>}
 */
function searchReplaceInFile(filename, searchValue, replaceValue) {
  const current = readTextFile(filename);
  const updated = current.replace(searchValue, replaceValue);
  return updated === current
    ? Promise.resolve()
    : fs.writeFile(filename, updated);
}

/**
 * Disables [Jetifier](https://developer.android.com/tools/jetifier).
 *
 * Jetifier is only necessary when you depend on code that has not yet migrated
 * to AndroidX. If we only deal with modern code, disabling it makes builds
 * slightly faster.
 */
function disableJetifier() {
  return searchReplaceInFile(
    "example/android/gradle.properties",
    "android.enableJetifier=true",
    "android.enableJetifier=false"
  );
}

function disableWebStorage() {
  return searchReplaceInFile(
    "example/package.json",
    /\s+"@react-native-webapis\/web-storage":.*/,
    ""
  );
}

/**
 * Infer the React Native version an out-of-tree platform package is based on.
 * @param {Manifest} manifest
 * @returns {string}
 */
function inferReactNativeVersion({ name, version, dependencies = {} }) {
  const codegenVersion = dependencies["@react-native/codegen"];
  if (!codegenVersion) {
    throw new Error(
      `Unable to determine the react-native version that ${name}@${version} is based on`
    );
  }

  const rnVersion = codegenVersion.split(".").slice(0, 2).join(".") + ".0-0";
  return rnVersion[0] === "^" || rnVersion[0] === "~"
    ? rnVersion
    : "^" + rnVersion;
}

/**
 * Fetches package information.
 * @param {string} pkg
 * @param {string} version
 * @return {Promise<Manifest>}
 */
function fetchPackageInfo(pkg, version) {
  return fetchPackageMetadata(pkg)
    .then(({ ["dist-tags"]: distTags, versions }) => {
      const tags = [version, version + "-stable", "v" + version + "-stable"];
      for (const t of tags) {
        if (distTags[t]) {
          return distTags[t];
        }
      }

      const allVersions = Object.keys(versions);
      for (let i = allVersions.length - 1; i >= 0; --i) {
        const v = allVersions[i];
        if (v.startsWith(version)) {
          return v;
        }
      }
    })
    .then((foundVersion) => {
      if (!foundVersion) {
        console.warn(`No match found for '${pkg}@${version}'`);
        return undefined;
      }
      return fetch(npmRegistryBaseURL + pkg + "/" + foundVersion);
    })
    .then((res) => res?.json() ?? /** @type {Manifest} */ ({}))
    .then(({ version, dependencies = {}, peerDependencies = {} }) => {
      return { version, dependencies, peerDependencies };
    });
}

/**
 * Fetches the latest react-native-windows@canary information via NuGet.
 * @return {Promise<Manifest>}
 */
function fetchReactNativeWindowsCanaryInfoViaNuGet() {
  const rnwNuGetFeed =
    "https://pkgs.dev.azure.com/ms/react-native/_packaging/react-native-public/nuget/v3/index.json";
  return fetch(rnwNuGetFeed)
    .then((res) => res.json())
    .then(({ resources }) => {
      if (!Array.isArray(resources)) {
        throw new Error("Unexpected format returned by the services endpoint");
      }

      const service = resources.find((svc) =>
        svc["@type"].startsWith("RegistrationsBaseUrl")
      );
      if (!service) {
        throw new Error("Failed to find 'RegistrationsBaseUrl' resource");
      }

      return service["@id"];
    })
    .then((url) => fetch(url + "/Microsoft.ReactNative.Cxx/index.json"))
    .then((res) => res.json())
    .then(({ items }) => {
      if (!Array.isArray(items)) {
        throw new Error(
          "Unexpected format returned by the 'RegistrationsBaseUrl' service"
        );
      }

      for (const item of items) {
        for (const pkg of item.items) {
          const version = pkg.catalogEntry?.version;
          if (typeof version === "string" && version.startsWith("0.0.0")) {
            const m = version.match(/(0\.0\.0-[.0-9a-z]+)/);
            if (m) {
              return m[1];
            }
          }
        }
      }

      throw new Error("Failed to find canary builds");
    })
    .then((version) => fetchPackageInfo("react-native-windows", version));
}

/**
 * Returns an object with common dependencies.
 * @param {string} v
 * @param {Manifest} manifest
 * @return {Promise<Record<string, string | undefined>>}
 */
async function resolveCommonDependencies(
  v,
  { dependencies = {}, peerDependencies = {} }
) {
  const [rnBabelPresetVersion, rnMetroConfigVersion, metroBabelPresetVersion] =
    await (async () => {
      if (["^", "canary", "nightly"].some((tag) => v.includes(tag))) {
        return [v, v, undefined];
      }

      const [
        { version: rnBabelPresetVersion },
        { version: rnMetroConfigVersion },
        { version: metroBabelPresetVersion },
      ] = await Promise.all([
        fetchPackageInfo("@react-native/babel-preset", v),
        fetchPackageInfo("@react-native/metro-config", v),
        (async () => {
          // Metro bumps and publishes all packages together, meaning we can use
          // `metro-react-native-babel-transformer` to determine the version of
          // `metro-react-native-babel-preset` that should be used.
          const version = dependencies["metro-react-native-babel-transformer"];
          if (version) {
            return { version };
          }

          // `metro-react-native-babel-transformer` is no longer a direct
          // dependency of `react-native`. As of 0.72, we should go through
          // `@react-native-community/cli-plugin-metro` instead.
          const cliVersion = dependencies["@react-native-community/cli"];
          if (!cliVersion) {
            // `@react-native-community/cli` is no longer a direct dependency in
            // 0.73. We should be using `@react-native/babel-preset` instead.
            return {};
          }

          const metroPluginInfo = await fetchPackageInfo(
            "@react-native-community/cli-plugin-metro",
            cliVersion.replace("^", "").split(".").slice(0, 2).join(".")
          );
          return { version: metroPluginInfo.dependencies?.["metro"] };
        })(),
      ]);
      return [
        rnBabelPresetVersion,
        rnMetroConfigVersion,
        metroBabelPresetVersion,
      ];
    })();

  // Starting with 0.76, `react-native` no longer depends on
  // `@react-native-community/cli`
  const rncli = dependencies["@react-native-community/cli"] ?? "latest";
  const rncliAndroid =
    dependencies["@react-native-community/cli-platform-android"] ?? rncli;
  const rncliIOS =
    dependencies["@react-native-community/cli-platform-ios"] ?? rncli;

  return {
    "@react-native-community/cli": rncli,
    "@react-native-community/cli-platform-android": rncliAndroid,
    "@react-native-community/cli-platform-ios": rncliIOS,
    "@react-native/babel-preset": rnBabelPresetVersion,
    "@react-native/metro-config": rnMetroConfigVersion,
    "metro-react-native-babel-preset": metroBabelPresetVersion,
    react: peerDependencies["react"],
  };
}

/**
 * Returns a profile for specified version.
 * @param {string} v
 * @param {boolean} coreOnly
 * @return {Promise<Record<string, string | undefined>>}
 */
async function getProfile(v, coreOnly) {
  const manifest = /** @type {Manifest} */ (readJSONFile("package.json"));
  const visionos = manifest.defaultPlatformPackages?.["visionos"];
  if (!visionos) {
    throw new Error("Missing platform package for visionOS");
  }

  switch (v) {
    case "canary-macos": {
      const info = await fetchPackageInfo("react-native-macos", "canary");
      const coreVersion = inferReactNativeVersion(info);
      const commonDeps = await resolveCommonDependencies(coreVersion, info);
      return {
        ...commonDeps,
        "react-native": coreVersion,
        "react-native-macos": "canary",
        "react-native-windows": undefined,
        [visionos]: undefined,
      };
    }

    case "canary-windows": {
      const info = await fetchReactNativeWindowsCanaryInfoViaNuGet();
      const coreVersion = info.peerDependencies?.["react-native"] || "nightly";
      const commonDeps = await resolveCommonDependencies(coreVersion, info);
      return {
        ...commonDeps,
        "react-native": coreVersion,
        "react-native-macos": undefined,
        "react-native-windows": info.version,
        [visionos]: undefined,
      };
    }

    case "nightly": {
      const info = await fetchPackageInfo("react-native", "nightly");
      const commonDeps = await resolveCommonDependencies(v, info);
      return {
        ...commonDeps,
        "react-native": "nightly",
        "react-native-macos": undefined,
        "react-native-windows": undefined,
        [visionos]: undefined,
      };
    }

    default: {
      const versions = {
        core: fetchPackageInfo("react-native", v),
        macos: coreOnly
          ? Promise.resolve({ version: undefined })
          : fetchPackageInfo("react-native-macos", v),
        visionos: coreOnly
          ? Promise.resolve({ version: undefined })
          : fetchPackageInfo(visionos, v),
        windows: coreOnly
          ? Promise.resolve({ version: undefined })
          : fetchPackageInfo("react-native-windows", v),
      };
      const reactNative = await versions.core;
      const commonDeps = await resolveCommonDependencies(v, reactNative);

      /** @type {(manifest: Manifest) => string | undefined} */
      const getVersion = ({ version }) => version;
      return {
        ...commonDeps,
        "react-native": reactNative.version,
        "react-native-macos": await versions.macos.then(getVersion),
        "react-native-windows": await versions.windows.then(getVersion),
        [visionos]: await versions.visionos.then(getVersion),
      };
    }
  }
}

/**
 * Sets specified React Native version.
 * @param {string} version
 * @param {boolean} coreOnly
 * @param {Record<string, string>} [overrides]
 * @return {Promise<void>}
 */
export async function setReactVersion(version, coreOnly, overrides = {}) {
  /** @type {fs.FileHandle | undefined} */
  let fd;
  try {
    const profile = { ...(await getProfile(version, coreOnly)), ...overrides };
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

      const tmpFile = manifestPath + ".tmp";
      fd = await fs.open(tmpFile, "w", 0o644);
      await fd.write(JSON.stringify(manifest, undefined, 2));
      await fd.write(os.EOL);
      await fd.close();
      fd = undefined;
      await fs.rename(tmpFile, manifestPath);
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    fd?.close();
  }
}

if (isMain(import.meta.url)) {
  const { values, positionals } = util.parseArgs({
    args: process.argv.slice(2),
    options: {
      "core-only": {
        type: "boolean",
        default: false,
      },
      overrides: {
        type: "string",
        default: "{}",
      },
    },
    strict: true,
    allowPositionals: true,
    tokens: false,
  });

  const version = positionals[0];
  if (!isValidVersion(version)) {
    const script = process.argv[1];
    console.log(
      `Usage: ${path.basename(script)} [<version number> | ${VALID_TAGS.join(" | ")}]`
    );
    process.exitCode = 1;
  } else {
    const { "core-only": coreOnly, overrides } =
      /** @type {RequiredObject<typeof values>} */ (values);
    setReactVersion(version, coreOnly, JSON.parse(overrides)).then(() => {
      const numVersion = VALID_TAGS.includes(version)
        ? Number.MAX_SAFE_INTEGER
        : toVersionNumber(version);
      if (numVersion >= v(0, 74, 0)) {
        disableJetifier();
      }

      // `@react-native-webapis/web-storage` is not compatible with codegen 0.71
      if (numVersion < v(0, 72, 0)) {
        disableWebStorage();
      }
    });
  }
}
