// @ts-check
import * as path from "node:path";
import { findFile } from "../helpers.js";
import { BaseMods } from "./ExpoConfigPlugins.mjs";

/**
 * @template {import("@expo/json-file").JSONObject} T
 * @param {T} [defaultRead={}]
 */
// @ts-expect-error Type '{}' is not assignable to type 'T'
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
 * @returns {import("./types.js").CustomModProvider}
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
