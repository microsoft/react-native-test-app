// @ts-check
const { withMod } = require("@expo/config-plugins");

/**
 * @typedef {import("@expo/config-plugins").ExportedConfig} ExportedConfig
 * @typedef {import("@expo/config-plugins").ExportedConfigWithProps} ExportedConfigWithProps
 * @typedef {import("@expo/config-plugins").Mod} Mod
 * @typedef {import("@expo/config-plugins").ModConfig} ModConfig
 * @typedef {ExportedConfigWithProps & { macos?: { infoPlist?: Record<string, unknown> }}} ExportedConfigWithPropsMac
 */

const macosPlatform = /** @type {keyof ModConfig} */ ("macos");

/** @type {Record<string, (config: ExportedConfig, mod: Mod) => ExportedConfig>} */
const macos = {
  withReactNativeHost: (config, action) => {
    return withMod(config, {
      platform: macosPlatform,
      mod: "reactNativeHost",
      action,
    });
  },
  // https://github.com/expo/expo/blob/sdk-51/packages/%40expo/config-plugins/src/plugins/ios-plugins.ts#L101
  withAppDelegate: (config, action) => {
    return withMod(config, {
      platform: macosPlatform,
      mod: "appDelegate",
      action,
    });
  },
  // https://github.com/expo/expo/blob/sdk-51/packages/%40expo/config-plugins/src/plugins/ios-plugins.ts#L116
  withInfoPlist: (config, action) => {
    return withMod(config, {
      platform: macosPlatform,
      mod: "infoPlist",
      async action(cfg) {
        /** @type {ExportedConfigWithPropsMac} */
        const config = await action(cfg);
        if (!config.macos) {
          config.macos = {};
        }
        config.macos.infoPlist = config.modResults;
        return config;
      },
    });
  },
  // https://github.com/expo/expo/blob/sdk-51/packages/%40expo/config-plugins/src/plugins/ios-plugins.ts#L173
  withXcodeProject: (config, action) => {
    return withMod(config, {
      platform: macosPlatform,
      mod: "xcodeproj",
      action,
    });
  },
};

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

exports.macos = macos;
exports.withReactNativeHost = withReactNativeHost;
exports.withSceneDelegate = withSceneDelegate;
