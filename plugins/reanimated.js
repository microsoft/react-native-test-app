// @ts-check
const { createRunOncePlugin } = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const fs = require("fs");
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
  const minorVersion = Math.trunc(version / 100) % 100;
  const header = [
    "#if !USE_TURBOMODULE",
    "#pragma clang diagnostic push",
    '#pragma clang diagnostic ignored "-Wnullability-completeness"',
    "",
    `#define REACT_NATIVE_MINOR_VERSION ${minorVersion}`,
    "#import <RNReanimated/REAInitializer.h>",
    "",
    "#if __has_include(<React/RCTJSIExecutorRuntimeInstaller.h>)",
    "#import <React/RCTJSIExecutorRuntimeInstaller.h>",
    "#endif",
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
  ].join("\n");

  if (version > 0 && version < 7200) {
    const installer = [
      `${indent}const auto installer = reanimated::REAJSIExecutorRuntimeInstaller(bridge, nullptr);`,
      `${indent}return std::make_unique<ExecutorFactory>(RCTJSIExecutorRuntimeInstaller(installer));`,
    ].join("\n");
    return [header, installer];
  } else {
    // As of React Native 0.72, we need to call `REAInitializer` instead. See
    // https://github.com/software-mansion/react-native-reanimated/commit/a8206f383e51251e144cb9fd5293e15d06896df0.
    const installer = [
      `${indent}return std::make_unique<ExecutorFactory>(`,
      `${indent}${indent}facebook::react::RCTJSIExecutorRuntimeInstaller([](facebook::jsi::Runtime &) {}));`,
    ].join("\n");
    return [header, installer];
  }
}

/**
 * Returns the version number of the specified package.
 * @param {string} pkg
 * @returns {number} The version number
 */
function versionOf(pkg) {
  const manifestPath = require.resolve(pkg + "/package.json");
  const manifest = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const { version } = JSON.parse(manifest);
  const [major, minor, patch] = version.split("-")[0].split(".").map(Number);
  return major * 10000 + minor * 100 + patch;
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

    const [header, installer] = installerFor(versionOf("react-native"));

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
