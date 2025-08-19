/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as util from "node:util";
import { isMain, readJSONFile } from "../helpers.js";
import type { Manifest } from "../types.js";
import { writeJSONFile } from "../utils/filesystem.mjs";
import { fetchPackageMetadata, npmRegistryBaseURL } from "../utils/npm.mjs";

const VALID_TAGS = ["canary-macos", "canary-windows", "nightly"];

/**
 * Returns whether specified string is a valid version number.
 */
function isValidVersion(v: string): boolean {
  return /^\d+\.\d+$/.test(v) || VALID_TAGS.includes(v);
}

/**
 * Type-safe `Object.keys()`
 */
function keys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Infer the React Native version an out-of-tree platform package is based on.
 */
function inferReactNativeVersion({
  name,
  version,
  dependencies = {},
}: Manifest): string {
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
 */
function fetchPackageInfo(pkg: string, version: string): Promise<Manifest> {
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
    .then((res) => res?.json() ?? ({} as Manifest))
    .then(({ version, dependencies = {}, peerDependencies = {} }) => {
      return { version, dependencies, peerDependencies };
    });
}

/**
 * Fetches the template manifest for the specified React Native version.
 */
function fetchTemplateManifest(version: string): Promise<Manifest> {
  const url = `https://raw.githubusercontent.com/react-native-community/template/refs/heads/${version}-stable/template/package.json`;
  console.log(`Fetching template manifest from ${url}`);
  return fetch(url, {
    headers: {
      Accept:
        "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
    },
  })
    .then((res) => res.text())
    .then((text) => JSON.parse(text));
}

/**
 * Fetches the latest react-native-windows@canary information via NuGet.
 */
function fetchReactNativeWindowsCanaryInfoViaNuGet(): Promise<Manifest> {
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
 */
async function resolveCommonDependencies(
  v: string,
  { peerDependencies = {} }: Manifest
): Promise<Record<string, string | undefined>> {
  const [devDependencies, rnBabelPresetVersion, rnMetroConfigVersion] =
    await (async () => {
      if (["^", "canary", "nightly"].some((tag) => v.includes(tag))) {
        return [{}, v, v];
      }

      const [
        { devDependencies },
        { version: rnBabelPresetVersion },
        { version: rnMetroConfigVersion },
      ] = await Promise.all([
        fetchTemplateManifest(v),
        fetchPackageInfo("@react-native/babel-preset", v),
        fetchPackageInfo("@react-native/metro-config", v),
      ]);
      return [
        devDependencies ?? {},
        rnBabelPresetVersion,
        rnMetroConfigVersion,
      ];
    })();

  const rncli = devDependencies["@react-native-community/cli"] ?? "latest";
  const rncliAndroid =
    devDependencies["@react-native-community/cli-platform-android"] ?? rncli;
  const rncliIOS =
    devDependencies["@react-native-community/cli-platform-ios"] ?? rncli;

  return {
    "@react-native-community/cli": rncli,
    "@react-native-community/cli-platform-android": rncliAndroid,
    "@react-native-community/cli-platform-ios": rncliIOS,
    "@react-native/babel-preset": rnBabelPresetVersion,
    "@react-native/metro-config": rnMetroConfigVersion,
    // Replace range to avoid React version mismatch
    react: peerDependencies["react"].replace(/^\^/, ""),
  };
}

/**
 * Returns a profile for specified version.
 */
async function getProfile(
  v: string,
  coreOnly: boolean
): Promise<Record<string, string | undefined>> {
  const manifest = readJSONFile<Manifest>("package.json");
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

      const getVersion = ({ version }: Manifest) => version;
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
 */
export async function setReactVersion(
  version: string,
  coreOnly: boolean,
  overrides: Record<string, string> = {}
): Promise<void> {
  try {
    const profile = { ...(await getProfile(version, coreOnly)), ...overrides };
    console.dir(profile, { depth: null });

    const manifests = ["package.json", "example/package.json"];
    for (const manifestPath of manifests) {
      const manifest = readJSONFile<Manifest>(manifestPath);
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
      writeJSONFile(tmpFile, manifest);
      fs.renameSync(tmpFile, manifestPath);
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
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
    const { "core-only": coreOnly, overrides } = values;
    setReactVersion(version, coreOnly, JSON.parse(overrides));
  }
}
