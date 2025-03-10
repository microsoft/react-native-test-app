// @ts-check
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { readTextFile } from "../scripts/helpers.js";
import { isObject } from "./utils.mjs";

/**
 * @import { XmlBuilderOptions } from "fast-xml-parser";
 * @import { ApplePlatform, JSONObject } from "../scripts/types.js";
 *
 * @typedef {Pick<
 *   Required<XmlBuilderOptions>,
 *   "attributeNamePrefix" | "ignoreAttributes" | "format" | "indentBy"
 * >} XmlOptions;
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
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {string} xcodeproj
 * @returns {void}
 */
export function configureXcodeSchemes(
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
