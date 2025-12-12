// @ts-check
/**
 * @import { ConfigPlugin } from "@expo/config-plugins";
 * @import { ProjectInfo } from "../types.js";
 * @typedef {Omit<ProjectInfo, "appJsonPath">} Internals
 */

/** @type {ConfigPlugin<Internals>} */
export const withInternal = (config, internals) => {
  config._internal = {
    isDebug: false,
    ...config._internal,
    ...internals,
  };
  return config;
};
