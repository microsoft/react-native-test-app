// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import {
  isObject,
  jsonFromPlist,
  plistFromJSON,
  projectPath,
  resolveResources,
} from "./utils.mjs";

/** @import { ApplePlatform, JSONArray, JSONObject } from "../scripts/types.js"; */

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {JSONObject} info
 */
function setMacProperties(appConfig, targetPlatform, info) {
  if (targetPlatform !== "macos") {
    return;
  }

  const config = appConfig[targetPlatform];
  if (!isObject(config)) {
    return;
  }

  const category = config["applicationCategoryType"];
  if (typeof category === "string") {
    info["LSApplicationCategoryType"] = category;
  }

  const copyright = config["humanReadableCopyright"];
  if (typeof copyright === "string") {
    info["NSHumanReadableCopyright"] = copyright;
  }
}

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {string} destination
 * @returns {void}
 */
export function generateInfoPlist(
  appConfig,
  targetPlatform,
  destination,
  fs = nodefs
) {
  const filename = "ReactTestApp/Info.plist";
  const infoPlistSrc = projectPath(filename, targetPlatform);

  const info = jsonFromPlist(infoPlistSrc);

  const resources = resolveResources(appConfig, targetPlatform);
  registerFonts(resources, targetPlatform, info);
  setMacProperties(appConfig, targetPlatform, info);

  const infoPlistDst = path.join(destination, path.basename(infoPlistSrc));
  fs.writeFileSync(infoPlistDst, plistFromJSON(info, filename));
}

/**
 * @param {JSONArray | undefined} resources
 * @param {ApplePlatform} targetPlatform
 * @param {JSONObject} info
 */
export function registerFonts(resources, targetPlatform, info) {
  if (!resources) {
    return;
  }

  const fontFiles = [".otf", ".ttf"];
  const fonts = [];
  for (const filename of resources) {
    if (typeof filename === "string") {
      const extname = path.extname(filename);
      if (fontFiles.includes(extname)) {
        fonts.push(path.basename(filename));
      }
    }
  }

  if (fonts.length > 0) {
    switch (targetPlatform) {
      case "macos":
        // https://developer.apple.com/documentation/bundleresources/information_property_list/atsapplicationfontspath
        info["ATSApplicationFontsPath"] = ".";
        break;
      default:
        // https://developer.apple.com/documentation/uikit/text_display_and_fonts/adding_a_custom_font_to_your_app
        info["UIAppFonts"] = fonts;
        break;
    }
  }
}
