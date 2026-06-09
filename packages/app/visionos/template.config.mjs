// @ts-check
import * as nodefs from "node:fs";
import { podfile } from "../ios/template.config.mjs";
import { toVersionNumber } from "../scripts/helpers.js";

/** @import { Configuration, ConfigureParams } from "../scripts/types.js"; */

/**
 * @param {string} _projectRoot
 * @param {unknown} _config
 * @returns {undefined}
 */
export function configure(_projectRoot, _config, _fs = nodefs) {
  return undefined;
}

/**
 * @param {ConfigureParams}  params
 * @returns {Configuration}
 */
export function getTemplate({ name, targetVersion }) {
  const targetVersionNum = toVersionNumber(targetVersion);
  return {
    files: {
      Podfile: podfile(name, "visionos/", targetVersionNum),
    },
    oldFiles: [
      "Podfile.lock",
      "Pods",
      `${name}.xcodeproj`,
      `${name}.xcworkspace`,
    ],
    scripts: {
      "build:visionos":
        "react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.visionos.jsbundle --assets-dest dist",
      visionos: "react-native run-visionos",
    },
    dependencies: {},
  };
}
