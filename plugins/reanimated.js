// @ts-check
const { createRunOncePlugin } = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const { getPackageVersion, toVersionNumber, v } = require("../scripts/helpers");
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

/**
 * Returns the code that initializes Reanimated.
 * @param {number} version
 * @param {string} indent
 * @returns {[string, string]}
 */
function installerFor(version, indent = "    ") {
  const minor = v(0, 1, 0);
  const minorVersion = Math.trunc(version / minor) % minor;

  if (version > 0 && version < v(0, 72, 0)) {
    const header = [
      "#if !USE_TURBOMODULE",
      "#pragma clang diagnostic push",
      '#pragma clang diagnostic ignored "-Wnullability-completeness"',
      "",
      `#define REACT_NATIVE_MINOR_VERSION ${minorVersion}`,
      "#import <RNReanimated/REAInitializer.h>",
      "",
      "#if __has_include(<reacthermes/HermesExecutorFactory.h>)",
      "#import <reacthermes/HermesExecutorFactory.h>",
      "using ExecutorFactory = facebook::react::HermesExecutorFactory;",
      "#elif __has_include(<React/HermesExecutorFactory.h>)",
      "#import <React/HermesExecutorFactory.h>",
      "using ExecutorFactory = facebook::react::HermesExecutorFactory;",
      "#else",
      "#import <React/JSCExecutorFactory.h>",
      "using ExecutorFactory = facebook::react::JSCExecutorFactory;",
      "#endif",
      "",
      "#pragma clang diagnostic pop",
      "#endif  // !USE_TURBOMODULE",
    ].join("\n");
    const installer = [
      `${indent}const auto installer = reanimated::REAJSIExecutorRuntimeInstaller(bridge, nullptr);`,
      `${indent}auto installBindings = facebook::react::RCTJSIExecutorRuntimeInstaller(installer);`,
      `${indent}return std::make_unique<ExecutorFactory>(installBindings);`,
    ].join("\n");
    return [header, installer];
  } else {
    // As of React Native 0.72, we need to call `REAInitializer` instead. See
    // https://github.com/software-mansion/react-native-reanimated/commit/a8206f383e51251e144cb9fd5293e15d06896df0.
    const header = [
      "#if !USE_TURBOMODULE",
      `#define REACT_NATIVE_MINOR_VERSION ${minorVersion}`,
      "#import <RNReanimated/REAInitializer.h>",
      "#endif  // !USE_TURBOMODULE",
    ].join("\n");
    return [header, `${indent}reanimated::REAInitializer(bridge);`];
  }
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
