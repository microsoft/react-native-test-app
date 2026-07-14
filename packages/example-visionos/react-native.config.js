const apple = (() => {
  const path = require("node:path");
  const ios =
    require.resolve("@react-native-community/cli-platform-ios/package.json");
  const apple = require.resolve("@react-native-community/cli-platform-apple", {
    paths: [path.dirname(ios)],
  });
  return require(apple);
})();

const visionos = { platformName: "visionos" };

module.exports = {
  ...require("../app/example/react-native.config.js"),
  platforms: {
    visionos: {
      npmPackageName: "react-native-macos",
      projectConfig: apple.getProjectConfig(visionos),
      dependencyConfig: apple.getDependencyConfig(visionos),
    },
  },
};
