if (process.argv.includes("--config=metro.config.macos.js")) {
  module.exports = {
    reactNativePath: "node_modules/react-native-macos",
  };
} else if (process.argv.includes("--config=metro.config.windows.js")) {
  module.exports = {
    reactNativePath: "node_modules/react-native-windows",
  };
} else {
  const path = require("path");
  const sourceDir = "android";
  module.exports = {
    project: {
      android: {
        sourceDir,
        manifestPath: path.relative(
          path.join(__dirname, sourceDir),
          path.join(
            path.dirname(require.resolve("react-native-test-app/package.json")),
            "android",
            "app",
            "src",
            "main",
            "AndroidManifest.xml"
          )
        ),
      },
      ios: {
        project: "ios/ReactTestApp-Dummy.xcodeproj",
      },
    },
  };
}
