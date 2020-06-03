if (process.argv.includes("--config=metro.config.macos.js")) {
  module.exports = {
    reactNativePath: "node_modules/react-native-macos",
  };
} else {
  module.exports = {
    project: {
      ios: {
        project: "ios/ReactTestApp-Dummy.xcodeproj",
      },
    },
  };
}
