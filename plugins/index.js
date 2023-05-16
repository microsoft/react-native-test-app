// @ts-check
const { withMod } = require("@expo/config-plugins");

/**
 * @typedef {import("@expo/config-plugins").ExportedConfig} ExportedConfig
 * @typedef {import("@expo/config-plugins").Mod} Mod
 */

/**
 * Provides the `ReactNativeHost` file for modification.
 * @param {ExportedConfig} config Exported config
 * @param {Mod} action Method to run on the mod when the config is compiled
 * @returns {ExportedConfig} Modified config
 */
function withReactNativeHost(config, action) {
  return withMod(config, {
    platform: "ios",
    mod: "reactNativeHost",
    action,
  });
}

/**
 * Provides the `SceneDelegate` file for modification.
 * @param {ExportedConfig} config Exported config
 * @param {Mod} action Method to run on the mod when the config is compiled
 * @returns {ExportedConfig} Modified config
 */
function withSceneDelegate(config, action) {
  return withMod(config, {
    platform: "ios",
    mod: "sceneDelegate",
    action,
  });
}

exports.withReactNativeHost = withReactNativeHost;
exports.withSceneDelegate = withSceneDelegate;
