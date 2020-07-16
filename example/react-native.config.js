if (process.argv.includes("--config=metro.config.macos.js")) {
  module.exports = {
    reactNativePath: "node_modules/react-native-macos",
  };
} else if (process.argv.includes("--config=metro.config.windows.js")) {
  module.exports = {
    reactNativePath: "node_modules/react-native-windows",
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
