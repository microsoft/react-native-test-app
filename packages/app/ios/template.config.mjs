// @ts-check
import * as nodefs from "node:fs";
import { toVersionNumber, v } from "../scripts/helpers.js";

/**
 * @import {
 *   Configuration,
 *   ConfigureParams,
 *   ProjectConfig,
 *   ProjectParams,
 * } from "../scripts/types.ts";
 */

/**
 * @param {string} name Root project name
 * @param {"" | "macos/" | "visionos/"} prefix Platform prefix
 * @param {number} targetVersion Target React Native version
 * @returns {string}
 */
export function podfile(name, prefix, targetVersion) {
  // https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
  /** @type {Record<typeof prefix, number>} */
  const newArchMatrix = {
    "": v(0, 76, 0),
    "macos/": v(1000, 0, 0),
    "visionos/": v(0, 76, 0),
  };
  const newArchEnabled = targetVersion >= newArchMatrix[prefix];
  return `ws_dir = Pathname.new(__dir__)
ws_dir = ws_dir.parent until
  File.exist?("#{ws_dir}/node_modules/react-native-test-app/${prefix}test_app.rb") ||
  ws_dir.expand_path.to_s == '/'
require "#{ws_dir}/node_modules/react-native-test-app/${prefix}test_app.rb"

workspace '${name}.xcworkspace'

use_test_app! :hermes_enabled => true, :fabric_enabled => ${newArchEnabled}
`;
}

/**
 * @param {string} _projectRoot
 * @param {Required<ProjectConfig>["ios"]} config
 * @returns {ProjectParams["ios"] | undefined}
 */
export function configure(_projectRoot, config, _fs = nodefs) {
  return config;
}

/**
 * @param {ConfigureParams} params
 * @returns {Configuration}
 */
export function getTemplate({ name, targetVersion }) {
  const targetVersionNum = toVersionNumber(targetVersion);
  return {
    files: {
      Podfile: podfile(name, "", targetVersionNum),
    },
    oldFiles: [
      "Podfile.lock",
      "Pods",
      `${name}.xcodeproj`,
      `${name}.xcworkspace`,
    ],
    scripts: {
      "build:ios":
        "react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
      ios: "react-native run-ios",
    },
    dependencies: {},
  };
}
