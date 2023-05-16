// @ts-check
const { createRunOncePlugin } = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const { withReactNativeHost } = require("./index");

/**
 * @typedef {import("@expo/config-plugins").ExportedConfig} ExportedConfig
 */

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

function rnMinorVersion() {
  const { version } = require("react-native/package.json");
  return version.split(".")[1];
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
  return withReactNativeHost(config, (config) => {
    if (config.modResults.language !== "objcpp") {
      throw new Error(
        "`ReactNativeHost` is not in Objective-C++ (did that change recently?)"
      );
    }

    // Add Reanimated headers
    config.modResults.contents = addContents(
      "header",
      config.modResults.contents,
      [
        "#if !USE_TURBOMODULE",
        "#pragma clang diagnostic push",
        '#pragma clang diagnostic ignored "-Wnullability-completeness"',
        "",
        `#define REACT_NATIVE_MINOR_VERSION ${rnMinorVersion()}`,
        "#import <RNReanimated/REAInitializer.h>",
        "",
        "#if __has_include(<reacthermes/HermesExecutorFactory.h>)",
        "#import <reacthermes/HermesExecutorFactory.h>",
        "using ExecutorFactory = HermesExecutorFactory;",
        "#elif __has_include(<React/HermesExecutorFactory.h>)",
        "#import <React/HermesExecutorFactory.h>",
        "using ExecutorFactory = HermesExecutorFactory;",
        "#else",
        "#import <React/JSCExecutorFactory.h>",
        "using ExecutorFactory = JSCExecutorFactory;",
        "#endif",
        "",
        "#pragma clang diagnostic pop",
        "#endif  // !USE_TURBOMODULE",
      ].join("\n"),
      /#import "ReactNativeHost\.h"/
    );

    // Install Reanimated's JSI executor runtime
    const indent = "    ";
    config.modResults.contents = addContents(
      "executor",
      config.modResults.contents,
      [
        `${indent}const auto installer = reanimated::REAJSIExecutorRuntimeInstaller(bridge, nullptr);`,
        `${indent}return std::make_unique<ExecutorFactory>(RCTJSIExecutorRuntimeInstaller(installer));`,
      ].join("\n"),
      /\/\/ jsExecutorFactoryForBridge: \(USE_TURBOMODULE=0\)/
    );
    return config;
  });
}

module.exports = createRunOncePlugin(
  withReanimatedExecutor,
  NAME,
  "UNVERSIONED"
);
