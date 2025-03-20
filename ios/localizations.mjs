// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { readTextFile } from "../scripts/helpers.js";
import { mkdir_p } from "../scripts/utils/filesystem.mjs";
import { isString, projectPath } from "./utils.mjs";

/**
 * @typedef {import("../scripts/types.ts").ApplePlatform} ApplePlatform;
 * @typedef {import("../scripts/types.ts").JSONObject} JSONObject;
 */

const DEFAULT_APP_NAME = "ReactTestApp";

/**
 * @param {JSONObject} appConfig
 * @returns {string}
 */
export function getProductName(appConfig) {
  const { name, displayName } = appConfig;
  const productName = displayName || name;
  return productName && isString(productName) ? productName : DEFAULT_APP_NAME;
}

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {string} destination
 * @returns {void}
 */
export function generateLocalizations(
  appConfig,
  targetPlatform,
  destination,
  fs = nodefs
) {
  const localizationsDir = "Localizations";
  const localizations_src = projectPath(localizationsDir, targetPlatform);
  if (!fs.existsSync(localizations_src)) {
    return;
  }

  const mainStrings = "Main.strings";
  const productName = getProductName(appConfig);
  const localizations_dst = path.join(destination, localizationsDir);

  for (const entry of fs.readdirSync(localizations_src)) {
    if (entry.startsWith(".")) {
      continue;
    }

    const lproj = path.join(localizations_dst, entry);
    mkdir_p(lproj, fs);

    const stringsFile = path.join(localizations_src, entry, mainStrings);
    const strings = readTextFile(stringsFile, fs);
    fs.writeFileSync(
      path.join(lproj, mainStrings),
      strings.replaceAll(DEFAULT_APP_NAME, productName)
    );
  }
}
