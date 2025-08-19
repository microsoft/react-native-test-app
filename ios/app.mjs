// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { loadAppConfig } from "../scripts/appConfig.mjs";
import {
  findFile,
  isMain,
  readTextFile,
  toVersionNumber,
} from "../scripts/helpers.js";
import { cp_r, mkdir_p, rm_r } from "../scripts/utils/filesystem.mjs";
import { generateAssetsCatalogs } from "./assetsCatalog.mjs";
import { generateEntitlements } from "./entitlements.mjs";
import {
  isBridgelessEnabled,
  isHermesEnabled,
  isNewArchEnabled,
} from "./features.mjs";
import { generateInfoPlist } from "./infoPlist.mjs";
import { generateLocalizations, getProductName } from "./localizations.mjs";
import { generatePrivacyManifest } from "./privacyManifest.mjs";
import {
  assertObject,
  isObject,
  isString,
  projectPath,
  resolveResources,
} from "./utils.mjs";
import {
  PRODUCT_DISPLAY_NAME,
  PRODUCT_VERSION,
  applyBuildSettings,
  applyPreprocessorDefinitions,
  applySwiftFlags,
  applyUserHeaderSearchPaths,
  configureBuildSchemes,
  openXcodeProject,
  overrideBuildSettings,
} from "./xcode.mjs";

/**
 * @import {
 *   ApplePlatform,
 *   JSONObject,
 *   JSONValue,
 *   ProjectConfiguration,
 * } from "../scripts/types.ts";
 */

const SUPPORTED_PLATFORMS = ["ios", "macos", "visionos"];

/**
 * @param {string} platform
 * @returns {asserts platform is ApplePlatform}
 */
function assertSupportedPlatform(platform) {
  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * @param {string} projectRoot
 * @param {string} destination
 * @returns {void}
 */
function exportNodeBinaryPath(projectRoot, destination, fs = nodefs) {
  const node = process.argv[0];
  fs.writeFileSync(
    path.join(projectRoot, ".xcode.env"),
    `export NODE_BINARY='${node}'\n`
  );
  fs.writeFileSync(
    path.join(destination, ".env"),
    `export PATH='${path.dirname(node)}':$PATH\n`
  );
}

/**
 * @param {string} projectRoot
 * @returns {string}
 */
function findReactNativeHostPath(projectRoot, fs = nodefs) {
  const dir = fileURLToPath(import.meta.url);
  const rnhPath = findFile("node_modules/@rnx-kit/react-native-host", dir, fs);
  if (!rnhPath) {
    throw new Error("Cannot find module '@rnx-kit/react-native-host'");
  }

  return path.relative(projectRoot, rnhPath);
}

/**
 * @param {JSONValue} platformConfig
 * @param {string} projectRoot
 * @param {ApplePlatform} targetPlatform
 * @returns {string}
 */
function findReactNativePath(
  platformConfig,
  projectRoot,
  targetPlatform,
  fs = nodefs
) {
  if (isObject(platformConfig)) {
    const userPath = platformConfig["reactNativePath"];
    if (isString(userPath)) {
      const p = findFile(userPath, projectRoot, fs);
      if (p) {
        return p;
      }
    }
  }

  const manifestURL = new URL("../package.json", import.meta.url);
  const manifest = JSON.parse(readTextFile(fileURLToPath(manifestURL), fs));
  const npmPackageName = manifest.defaultPlatformPackages[targetPlatform];
  if (!npmPackageName) {
    throw new Error(`Unsupported target platform: ${targetPlatform}`);
  }

  const pkg = findFile(`node_modules/${npmPackageName}`, projectRoot, fs);
  if (!pkg) {
    throw new Error(`Cannot find module '${npmPackageName}'`);
  }

  return pkg;
}

/**
 * @param {string} p
 * @returns {number}
 */
function readPackageVersion(p, fs = nodefs) {
  const manifest = JSON.parse(readTextFile(path.join(p, "package.json"), fs));
  return toVersionNumber(manifest["version"]);
}

/**
 * @param {string} projectRoot
 * @param {string} targetPlatform
 * @param {JSONObject} options
 * @returns {ProjectConfiguration}
 */
export function generateProject(
  projectRoot,
  targetPlatform,
  options,
  fs = nodefs
) {
  assertSupportedPlatform(targetPlatform);

  const appConfig = loadAppConfig(projectRoot, fs);

  const xcodeproj = "ReactTestApp.xcodeproj";

  const xcodeprojSrc = projectPath(xcodeproj, targetPlatform);
  const nodeModulesDir = findFile("node_modules", projectRoot, fs);
  if (!nodeModulesDir) {
    throw new Error("Cannot not find 'node_modules' folder");
  }

  const destination = path.join(nodeModulesDir, ".generated", targetPlatform);
  const xcodeprojDst = path.join(destination, xcodeproj);

  // Copy Xcode project files
  mkdir_p(destination, fs);
  cp_r(xcodeprojSrc, xcodeprojDst, fs);
  configureBuildSchemes(appConfig, targetPlatform, xcodeprojDst, fs);

  // Link source files
  const srcDirs = ["ReactTestApp", "ReactTestAppTests", "ReactTestAppUITests"];
  for (const file of srcDirs) {
    const symlink = path.join(destination, file);
    if (fs.existsSync(symlink)) {
      rm_r(symlink, fs);
    }
    fs.symlinkSync(projectPath(file, targetPlatform), symlink);
  }

  // Shared code lives in `ios/ReactTestApp/`
  if (targetPlatform !== "ios") {
    const shared = path.join(destination, "Shared");
    if (!fs.existsSync(shared)) {
      const source = new URL("ReactTestApp", import.meta.url);
      fs.symlinkSync(fileURLToPath(source), shared);
    }
  }

  generateAssetsCatalogs(appConfig, targetPlatform, destination, undefined, fs);
  generateEntitlements(appConfig, targetPlatform, destination, fs);
  generateInfoPlist(appConfig, targetPlatform, destination, fs);
  generatePrivacyManifest(appConfig, targetPlatform, destination, fs);
  generateLocalizations(appConfig, targetPlatform, destination, fs);

  // Note the location of Node so we can use it later in script phases
  exportNodeBinaryPath(projectRoot, destination, fs);

  const platformConfig = appConfig[targetPlatform];
  const reactNativePath = findReactNativePath(
    platformConfig,
    projectRoot,
    targetPlatform,
    fs
  );
  const reactNativeVersion = readPackageVersion(reactNativePath, fs);

  /** @type {ProjectConfiguration} */
  const project = {
    xcodeprojPath: path.resolve(xcodeprojDst),
    reactNativePath: path.resolve(reactNativePath),
    reactNativeVersion,
    reactNativeHostPath: findReactNativeHostPath(projectRoot, fs),
    useHermes: isHermesEnabled(reactNativeVersion, options),
    useNewArch: isNewArchEnabled(reactNativeVersion, options),
    useBridgeless: isBridgelessEnabled(reactNativeVersion, options),
    buildSettings: {},
    testsBuildSettings: {},
    uitestsBuildSettings: {},
    resources: resolveResources(appConfig, targetPlatform)?.filter(
      (item) => typeof item === "string"
    ),
  };

  applyBuildSettings(platformConfig, project, projectRoot, destination, fs);

  const overrides = options["buildSettingOverrides"];
  if (isObject(overrides)) {
    overrideBuildSettings(project.buildSettings, overrides);
  }

  project.buildSettings[PRODUCT_DISPLAY_NAME] = getProductName(appConfig);

  const productVersion = appConfig["version"];
  project.buildSettings[PRODUCT_VERSION] =
    productVersion && isString(productVersion) ? productVersion : "1.0";

  const singleApp = appConfig["singleApp"];
  if (isString(singleApp)) {
    project.singleApp = singleApp;
  }

  applyPreprocessorDefinitions(project);
  applySwiftFlags(project);
  applyUserHeaderSearchPaths(project, destination);

  return project;
}

/**
 * @param {string} projectRoot
 * @param {string} targetPlatform
 * @param {JSONObject} options
 * @returns {ProjectConfiguration}
 */
export function makeProject(projectRoot, targetPlatform, options, fs = nodefs) {
  const project = generateProject(projectRoot, targetPlatform, options, fs);

  /** @type {Record<string, Record<string, string | string[]>>} */
  const mods = {
    ReactTestApp: project.buildSettings,
    ReactTestAppTests: project.testsBuildSettings,
    ReactTestAppUITests: project.uitestsBuildSettings,
  };

  const pbxproj = openXcodeProject(project.xcodeprojPath);
  for (const target of pbxproj.targets) {
    const { name: targetName } = target;
    if (typeof targetName !== "string" || !(targetName in mods)) {
      continue;
    }

    const targetBuildSettings = Object.entries(mods[targetName]);
    for (const { buildSettings } of target.buildConfigurations) {
      assertObject(buildSettings, "target.buildConfigurations[].buildSettings");

      for (const [setting, value] of targetBuildSettings) {
        if (Array.isArray(value)) {
          const origValue = buildSettings[setting] ?? ["$(inherited)"];
          if (Array.isArray(origValue)) {
            origValue.push(...value);
            buildSettings[setting] = origValue;
          } else {
            buildSettings[setting] = [origValue, ...value].join(" ");
          }
        } else {
          buildSettings[setting] = value;
        }
      }
    }
  }
  pbxproj.save();

  return project;
}

if (isMain(import.meta.url)) {
  const [, , projectRoot, platform, options] = process.argv;
  const user = typeof options === "string" ? JSON.parse(options) : {};
  const project = makeProject(projectRoot, platform, user);
  console.log(JSON.stringify(project, undefined, 2));
}
