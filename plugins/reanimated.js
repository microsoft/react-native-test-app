const { createRunOncePlugin } = require("@expo/config-plugins");
const {
  mergeContents,
} = require("@expo/config-plugins/build/utils/generateCode");
const { withBridgeDelegate } = require("./index");

const NAME = "react-native-reanimated";

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

function withReanimatedExecutor(config) {
  return withBridgeDelegate(config, (config) => {
    if (config.modResults.language !== "objcpp") {
      throw new Error(
        "`BridgeDelegate` is not in Objective-C++ (did that change recently?)"
      );
    }

    // Add Reanimated headers
    config.modResults.contents = addContents(
      "header",
      config.modResults.contents,
      [
        "#pragma clang diagnostic push",
        '#pragma clang diagnostic ignored "-Wnullability-completeness"',
        "",
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
      ].join("\n"),
      /#import "BridgeDelegate\.h"/
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
