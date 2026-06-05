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
      Podfile: podfile(name, "macos/", targetVersionNum),
    },
    oldFiles: [
      "Podfile.lock",
      "Pods",
      `${name}.xcodeproj`,
      `${name}.xcworkspace`,
    ],
    scripts: {
      "build:macos":
        "react-native bundle --entry-file index.js --platform macos --dev true --bundle-output dist/main.macos.jsbundle --assets-dest dist",
      macos: `react-native run-macos --scheme ${name}`,
    },
    dependencies: {},
  };
}
