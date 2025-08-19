// @ts-check
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { findFile, readTextFile } from "../scripts/helpers.js";
import {
  assertArray,
  assertObject,
  assertUniqueId,
  isObject,
  isString,
  jsonFromPlist,
  writePlistFromJSON,
} from "./utils.mjs";

/**
 * @import {
 *   ApplePlatform,
 *   JSONObject,
 *   JSONValue,
 *   ProjectConfiguration,
 *   XmlOptions,
 * } from "../scripts/types.js";
 */

export const IPHONEOS_DEPLOYMENT_TARGET = "IPHONEOS_DEPLOYMENT_TARGET";
export const MACOSX_DEPLOYMENT_TARGET = "MACOSX_DEPLOYMENT_TARGET";
export const XROS_DEPLOYMENT_TARGET = "XROS_DEPLOYMENT_TARGET";

export const CODE_SIGN_ENTITLEMENTS = "CODE_SIGN_ENTITLEMENTS";
export const CODE_SIGN_IDENTITY = "CODE_SIGN_IDENTITY";
export const DEVELOPMENT_TEAM = "DEVELOPMENT_TEAM";
export const ENABLE_TESTING_SEARCH_PATHS = "ENABLE_TESTING_SEARCH_PATHS";
export const GCC_PREPROCESSOR_DEFINITIONS = "GCC_PREPROCESSOR_DEFINITIONS";
export const OTHER_SWIFT_FLAGS = "OTHER_SWIFT_FLAGS";
export const PRODUCT_BUILD_NUMBER = "PRODUCT_BUILD_NUMBER";
export const PRODUCT_BUNDLE_IDENTIFIER = "PRODUCT_BUNDLE_IDENTIFIER";
export const PRODUCT_DISPLAY_NAME = "PRODUCT_DISPLAY_NAME";
export const PRODUCT_VERSION = "PRODUCT_VERSION";
export const USER_HEADER_SEARCH_PATHS = "USER_HEADER_SEARCH_PATHS";
export const WARNING_CFLAGS = "WARNING_CFLAGS";

/**
 * @param {JSONValue} platformConfig
 * @param {ProjectConfiguration} project
 * @param {string} projectRoot
 * @param {string} destination
 * @returns {ProjectConfiguration}
 */
export function applyBuildSettings(
  platformConfig,
  project,
  projectRoot,
  destination,
  fs = nodefs
) {
  const config = isObject(platformConfig) ? platformConfig : {};

  const codeSignEntitlements = config["codeSignEntitlements"];
  if (isString(codeSignEntitlements)) {
    const appManifest = findFile("app.json", projectRoot, fs);
    if (!appManifest) {
      throw new Error("Cannot find 'app.json'");
    }

    const packageRoot = path.dirname(appManifest);
    const entitlements = path.join(packageRoot, codeSignEntitlements);
    const relPath = path.relative(destination, entitlements);
    project.buildSettings[CODE_SIGN_ENTITLEMENTS] = relPath;
  }

  const codeSignIdentity = config["codeSignIdentity"];
  if (isString(codeSignIdentity)) {
    project.buildSettings[CODE_SIGN_IDENTITY] = codeSignIdentity;
  }

  const developmentTeam = config["developmentTeam"];
  if (isString(developmentTeam)) {
    project.buildSettings[DEVELOPMENT_TEAM] = developmentTeam;
    project.testsBuildSettings[DEVELOPMENT_TEAM] = developmentTeam;
    project.uitestsBuildSettings[DEVELOPMENT_TEAM] = developmentTeam;
  }

  const bundleIdentifier = config["bundleIdentifier"];
  if (isString(bundleIdentifier)) {
    project.buildSettings[PRODUCT_BUNDLE_IDENTIFIER] = bundleIdentifier;
    project.testsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER] =
      `${bundleIdentifier}Tests`;
    project.uitestsBuildSettings[PRODUCT_BUNDLE_IDENTIFIER] =
      `${bundleIdentifier}UITests`;
  }

  const buildNumber = config["buildNumber"];
  project.buildSettings[PRODUCT_BUILD_NUMBER] =
    buildNumber && isString(buildNumber) ? buildNumber : "1";

  return project;
}

/**
 * @param {ProjectConfiguration} project
 * @returns {void}
 */
export function applyPreprocessorDefinitions({
  reactNativeVersion,
  useNewArch,
  useBridgeless,
  buildSettings,
}) {
  const existing = buildSettings[GCC_PREPROCESSOR_DEFINITIONS];
  const preprocessors = Array.isArray(existing) ? existing : [];

  preprocessors.push(`REACT_NATIVE_VERSION=${reactNativeVersion}`);

  if (useNewArch) {
    preprocessors.push("FOLLY_NO_CONFIG=1");
    preprocessors.push("RCT_NEW_ARCH_ENABLED=1");
    preprocessors.push("USE_FABRIC=1");
    if (useBridgeless) {
      preprocessors.push("USE_BRIDGELESS=1");
    }
  }

  buildSettings[GCC_PREPROCESSOR_DEFINITIONS] = preprocessors;
}

/**
 * @param {ProjectConfiguration} project
 * @returns {void}
 */
export function applySwiftFlags({
  singleApp,
  useNewArch,
  useBridgeless,
  buildSettings,
}) {
  const existingFlags = buildSettings[OTHER_SWIFT_FLAGS];
  const flags = Array.isArray(existingFlags) ? existingFlags : [];

  if (useNewArch) {
    flags.push("-DUSE_FABRIC");
    if (useBridgeless) {
      flags.push("-DUSE_BRIDGELESS");
    }
  }

  if (singleApp) {
    flags.push("-DENABLE_SINGLE_APP_MODE");
  }

  buildSettings[OTHER_SWIFT_FLAGS] = flags;
}

/**
 * @param {ProjectConfiguration} project
 * @param {string} destination
 * @returns {void}
 */
export function applyUserHeaderSearchPaths({ buildSettings }, destination) {
  const existingPaths = buildSettings[USER_HEADER_SEARCH_PATHS];
  const searchPaths = Array.isArray(existingPaths) ? existingPaths : [];

  searchPaths.push(path.resolve(path.dirname(destination)));

  buildSettings[USER_HEADER_SEARCH_PATHS] = searchPaths;
}

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {string} xcodeproj
 * @returns {void}
 */
export function configureBuildSchemes(
  appConfig,
  targetPlatform,
  xcodeproj,
  fs = nodefs
) {
  const xcschemesDir = path.join(xcodeproj, "xcshareddata", "xcschemes");
  const xcscheme = path.join(xcschemesDir, "ReactTestApp.xcscheme");

  const platformConfig = appConfig[targetPlatform];
  const metalApiValidation =
    !isObject(platformConfig) || platformConfig["metalAPIValidation"];

  // Oddly enough, to disable Metal API validation, we need to add
  // `enableGPUValidationMode = "1"` to the xcscheme Launch Action.
  if (metalApiValidation === false) {
    /** @type {XmlOptions} */
    const xmlOptions = {
      attributeNamePrefix: "@_",
      ignoreAttributes: false,
      format: true,
      indentBy: "   ", // Xcode uses three spaces
    };

    const parser = new XMLParser(xmlOptions);
    const xml = parser.parse(readTextFile(xcscheme, fs));

    const key = xmlOptions.attributeNamePrefix + "enableGPUValidationMode";
    xml.Scheme.LaunchAction[key] = "1";

    const builder = new XMLBuilder(xmlOptions);
    fs.writeFileSync(xcscheme, builder.build(xml));
  }

  const { name } = appConfig;
  if (typeof name === "string" && name) {
    // Make a copy of `ReactTestApp.xcscheme` with the app name for convenience.
    fs.copyFileSync(xcscheme, path.join(xcschemesDir, `${name}.xcscheme`));
  }
}

/**
 * @param {string} xcodeproj
 */
export function openXcodeProject(xcodeproj) {
  const projectPath = path.join(xcodeproj, "project.pbxproj");
  const pbxproj = jsonFromPlist(projectPath);
  assertObject(pbxproj.objects, "pbxproj.objects");
  assertUniqueId(pbxproj.rootObject, "pbxproj.rootObject");

  const { objects } = pbxproj;
  const project = objects[pbxproj.rootObject];
  assertObject(project, pbxproj.rootObject);

  const { targets } = project;
  assertArray(targets, "rootObject.targets");

  return {
    save() {
      writePlistFromJSON(projectPath, pbxproj);
    },
    get targets() {
      return targets.map((target, index) => {
        assertUniqueId(target, `rootObject.targets[${index}]`);

        const product = objects[target];
        assertObject(product, target);

        const { buildConfigurationList } = product;
        assertUniqueId(buildConfigurationList, "buildConfigurationList");
        assertObject(objects[buildConfigurationList], buildConfigurationList);

        const { buildConfigurations } = objects[buildConfigurationList];
        assertArray(buildConfigurations, "buildConfigurations");

        /** @type {{ buildConfigurations: JSONObject[]; [key: string]: JSONValue; }} */
        const targets = {
          ...product,
          buildConfigurations: buildConfigurations.map((config) => {
            assertUniqueId(config, `buildConfigurations[${config}]`);
            const buildConfiguration = objects[config];
            assertObject(buildConfiguration, config);
            return buildConfiguration;
          }),
        };
        return targets;
      });
    },
  };
}

/**
 * @param {JSONObject} buildSettings
 * @param {JSONObject} overrides
 * @returns {JSONObject}
 */
export function overrideBuildSettings(buildSettings, overrides) {
  for (const [key, value] of Object.entries(overrides)) {
    buildSettings[key] = value;
  }
  return buildSettings;
}
