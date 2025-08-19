// @ts-check
const { createRunOncePlugin } = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const { getPackageVersion, toVersionNumber, v } = require("../scripts/helpers");
const { withReactNativeHost } = require("./index");

/** @import { ExportedConfig } from "@expo/config-plugins" */

const NAME = "react-native-reanimated";

/**
 * Adds specified contents to an existing file with a generated header.
 * @param {string} tag Tag used to generate a unique header
 * @param {string} src Contents of the source file
 * @param {string} newSrc Contents to be added
 * @param {RegExp} anchor `RegExp` providing the position at which contents is added
 * @returns {string} The merged content
 */
function addContents(tag, src, newSrc, anchor) {
  return mergeContents({
    tag: `${NAME}-${tag}`,
    src,
    newSrc,
    anchor,
    offset: 1,
    comment: "//",
  }).contents;
}

/**
 * Returns the code that initializes Reanimated.
 * @param {number} version
 * @param {string} indent
 * @returns {[string, string]}
 */
function installerFor(version, indent = "    ") {
  const minor = v(0, 1, 0);
  const minorVersion = Math.trunc(version / minor) % minor;

  // As of React Native 0.72, we need to call `REAInitializer` instead. See
  // https://github.com/software-mansion/react-native-reanimated/commit/a8206f383e51251e144cb9fd5293e15d06896df0.
  const header = [
    "#if !USE_FABRIC",
    `#define REACT_NATIVE_MINOR_VERSION ${minorVersion}`,
    "#import <RNReanimated/REAInitializer.h>",
    "#endif  // !USE_FABRIC",
  ].join("\n");
  return [header, `${indent}reanimated::REAInitializer(bridge);`];
}

/**
 * Plugin to inject Reanimated's JSI executor in the React bridge delegate.
 *
 * Only applies to iOS.
 *
 * @param {ExportedConfig} config Exported config
 * @returns {ExportedConfig} Modified config
 */
function withReanimatedExecutor(config) {
  // As of 3.4.0, manual initialization is no longer necessary:
  // https://github.com/software-mansion/react-native-reanimated/commit/6f19a367f4939cbbc82f3de6668fd896c695a2ac
  const reanimated = getPackageVersion("react-native-reanimated");
  if (toVersionNumber(reanimated) >= v(3, 4, 0)) {
    return config;
  }

  return withReactNativeHost(config, (config) => {
    if (config.modResults.language !== "objcpp") {
      throw new Error(
        "`ReactNativeHost` is not in Objective-C++ (did that change recently?)"
      );
    }

    const rnVersion = toVersionNumber(getPackageVersion("react-native"));
    const [header, installer] = installerFor(rnVersion);

    // Add Reanimated headers
    config.modResults.contents = addContents(
      "header",
      config.modResults.contents,
      header,
      /#import "ReactNativeHost\.h"/
    );

    // Install Reanimated's JSI executor runtime
    config.modResults.contents = addContents(
      "installer",
      config.modResults.contents,
      installer,
      /\/\/ jsExecutorFactoryForBridge: \(USE_FABRIC=0\)/
    );

    return config;
  });
}

module.exports = createRunOncePlugin(
  withReanimatedExecutor,
  NAME,
  "UNVERSIONED"
);
