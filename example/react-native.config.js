const path = require("path");

module.exports = {
  project: {
    android: {
      sourceDir: "android",
      manifestPath: path.relative(
        path.join(__dirname, "android"),
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
    windows: {
      sourceDir: "windows",
      solutionFile: "Example.sln",
      project: {
        projectFile: path.relative(
          path.join(__dirname, "windows"),
          path.join(
            "node_modules",
            ".generated",
            "windows",
            "ReactTestApp",
            "ReactTestApp.vcxproj"
          )
        ),
      },
    },
  },
};
