// @ts-check
import * as path from "path";
import { findFile } from "../validate-manifest.js";
import { BaseMods } from "./ExpoConfigPlugins.mjs";

/**
 * @template ModType
 * @template Props
 * @typedef {ReturnType<typeof BaseMods.provider<ModType, Props>>} BaseModProviderMethods
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
 * @param {boolean} isOutsideOfProjectRoot
 * @returns {<ModType, Props>(original: BaseModProviderMethods<ModType, Props>, file: string) => BaseModProviderMethods<ModType, Props>}
 */
export function makeFilePathModifier(
  actualProjectDir,
  isOutsideOfProjectRoot = false
) {
  return function (original, file) {
    return BaseMods.provider({
      ...original,
      getFilePath: async ({ modRequest: { projectRoot } }) => {
        const name = path.posix.join(actualProjectDir, file);
        if (isOutsideOfProjectRoot) {
          return name;
        }
        const result = findFile(name, projectRoot);
        return result || name;
      },
    });
  };
}
