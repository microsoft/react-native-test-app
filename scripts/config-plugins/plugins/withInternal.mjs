// @ts-check
/**
 * @typedef {import("../types.js").ProjectInfo} ProjectInfo
 * @typedef {Omit<ProjectInfo, "appJsonPath">} Internals
 */
/**
 * @template Props
 * @typedef {import("@expo/config-plugins").ConfigPlugin<Internals>} ConfigPlugin
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
