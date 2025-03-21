// @ts-check
import { spawnSync } from "node:child_process";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { sourceForAppConfig } from "../scripts/appConfig.mjs";
import { readJSONFile } from "../scripts/helpers.js";
import { cp_r, mkdir_p, rm_r } from "../scripts/utils/filesystem.mjs";
import { isObject, projectPath } from "./utils.mjs";

/**
 * @import { ApplePlatform, JSONObject, JSONValue } from "../scripts/types.js";
 *
 * @typedef {{ filename: string; }} Icon;
 */

const ALTERNATE_ICONS_KEY = "alternateIcons";
const APP_ICON_KEY = "AppIcon";
const PRIMARY_ICON_KEY = "primaryIcon";

/**
 * @param {JSONValue} value
 * @returns {value is Icon}
 */
function isIcon(value) {
  return Boolean(value && typeof value === "object" && "filename" in value);
}

/**
 * @param {[string, JSONValue]} entry
 * @returns {entry is [string, Icon]}
 */
function isIconEntry(entry) {
  const [, value] = entry;
  return isIcon(value);
}

/**
 * @param {JSONValue} icons
 * @returns {[string, Icon][]}
 */
function parseAlternateIcons(icons) {
  if (!isObject(icons)) {
    return [];
  }

  /** @type {[string, Icon][]} */
  const sanitizedIcons = [];
  for (const entry of Object.entries(icons)) {
    if (entry[0] !== APP_ICON_KEY && isIconEntry(entry)) {
      sanitizedIcons.push(entry);
    }
  }

  return sanitizedIcons;
}

/**
 * @param {string} input
 * @param {string} output
 * @param {number} width
 * @param {number} height
 */
function resampleImage(input, output, width, height) {
  const args = [
    "--resampleHeightWidth",
    height.toString(),
    width.toString(),
    "--out",
    output,
    input,
  ];
  spawnSync("sips", args, { stdio: "inherit" });
}

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {string} destination
 * @returns {void}
 */
export function generateAssetsCatalogs(
  appConfig,
  targetPlatform,
  destination,
  resizeImage = resampleImage,
  fs = nodefs
) {
  const xcassets_src = projectPath(
    "ReactTestApp/Assets.xcassets",
    targetPlatform
  );
  const xcassets_dst = path.join(destination, path.basename(xcassets_src));

  rm_r(xcassets_dst, fs);
  cp_r(xcassets_src, destination, fs);

  const platformConfig = appConfig[targetPlatform];
  if (!isObject(platformConfig)) {
    return;
  }

  const icons = platformConfig["icons"];
  if (!isObject(icons)) {
    return;
  }

  const primaryIcon = icons[PRIMARY_ICON_KEY];
  if (!isIcon(primaryIcon)) {
    return;
  }

  const appIcons = parseAlternateIcons(icons[ALTERNATE_ICONS_KEY]);
  appIcons.push([APP_ICON_KEY, primaryIcon]);

  const templateIconSet = "AppIcon.appiconset";
  const template = readJSONFile(
    path.join(xcassets_src, templateIconSet, "Contents.json")
  );
  if (!Array.isArray(template.images)) {
    throw new Error(`${templateIconSet}: Expected 'images' to be an array`);
  }

  const appManifestDir = sourceForAppConfig(appConfig);

  for (const [setName, appIcon] of appIcons) {
    const appIconSet = path.join(destination, `${setName}.appiconset`);
    mkdir_p(appIconSet, fs);

    const icon = path.join(appManifestDir, appIcon.filename);
    const extname = path.extname(icon);
    const basename = path.basename(icon, extname);

    /** @type {Icon[]} */
    const images = [];

    for (const image of template.images) {
      const { scale, size } = image;
      const [width, height] = size.split("x");
      const filename = `${basename}-${height}@${scale}${extname}`;
      images.push({ filename, ...image });

      const output = path.join(appIconSet, filename);
      const x = parseFloat(scale);
      resizeImage(icon, output, Number(width) * x, Number(height) * x);
    }

    const contents = { images, info: template["info"] };
    const dest = path.join(appIconSet, "Contents.json");
    fs.writeFileSync(dest, JSON.stringify(contents, undefined, 2));
  }
}
