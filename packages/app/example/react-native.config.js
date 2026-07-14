const project = (() => {
  try {
    const { configureProjects } = require("react-native-test-app");
    return configureProjects({
      android: {
        sourceDir: "android",
      },
      ios: {
        sourceDir: "ios",
      },
      macos: {
        sourceDir: "macos",
      },
      visionos: {
        sourceDir: "visionos",
      },
      windows: {
        sourceDir: "windows",
        solutionFile: "windows/Example.sln",
      },
    });
  } catch (_) {
    return undefined;
  }
})();

module.exports = {
  ...(project ? { project } : undefined),
};
