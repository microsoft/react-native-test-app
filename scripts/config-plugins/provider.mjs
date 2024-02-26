// @ts-check
import * as path from "node:path";
import { findFile } from "../helpers.js";
import { BaseMods } from "./ExpoConfigPlugins.mjs";

/**
 * @typedef {import("@expo/config-plugins/build/plugins/createBaseMod.js").ForwardedBaseModOptions} ForwardedBaseModOptions
 */
/**
 * @template ModType
 * @template {ForwardedBaseModOptions} Props
 * @typedef {import("@expo/config-plugins/build/plugins/createBaseMod.js").BaseModProviderMethods<ModType, Props>} BaseModProviderMethods
 */

export function makeNullProvider(defaultRead = {}) {
  return BaseMods.provider({
    getFilePath: () => "",
    read: () => Promise.resolve(defaultRead),
    write: () => Promise.resolve(),
  });
}

/**
 * Creates a mod modifier that just changes `getFilePath()`.
 * @param {string} actualProjectDir
 * @returns {<ModType, Props extends ForwardedBaseModOptions>(original: BaseModProviderMethods<ModType, Props>, file: string) => BaseModProviderMethods<ModType, Props>}
 */
export function makeFilePathModifier(actualProjectDir) {
  return function (original, file) {
    return BaseMods.provider({
      ...original,
      getFilePath: async ({ modRequest: { projectRoot } }) => {
        const name = path.posix.join(actualProjectDir, file);
        const result = findFile(name, projectRoot);
        return result || name;
      },
    });
  };
}
