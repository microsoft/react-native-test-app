// @ts-check
import * as nodefs from "node:fs";

/**
 * @import {
 *   Configuration,
 *   ConfigureParams,
 * } from "../app/scripts/types.ts";
 */

/**
 * @param {string} _projectRoot
 * @param {unknown} _config
 * @returns {Record<string, unknown>}
 */
export function configure(_projectRoot, _config, _fs = nodefs) {
  return { "@rnx-kit/react-native-template-web": true };
}

/**
 * @param {ConfigureParams} _params
 * @returns {Configuration}
 */
export function getTemplate(_params) {
  return {
    files: {
      "index.html": "<!doctype html><html></html>",
    },
    oldFiles: ["webpack.config.js"],
    scripts: {
      "build:web":
        "react-native bundle --entry-file index.js --platform web --dev true --bundle-output dist/main.web.jsbundle --assets-dest dist",
    },
    dependencies: {
      "react-native-web": "^0.21.2",
    },
  };
}
