import { ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { shouldUpdateReactNativeConfig as shouldUpdateReactNativeConfigActual } from "../../scripts/configure.mjs";
import { fs, setMockFiles } from "../fs.mock.js";

describe("shouldUpdateReactNativeConfig()", () => {
  const rnConfigFile = "react-native.config.js";

  const shouldUpdateReactNativeConfig = () =>
    shouldUpdateReactNativeConfigActual(rnConfigFile, fs);

  afterEach(() => setMockFiles());

  it("returns true if `react-native.config.js` does not exist", () => {
    ok(shouldUpdateReactNativeConfig());
  });

  it("returns true if `react-native.config.js` is not configured", () => {
    setMockFiles({ [rnConfigFile]: "module.exports = {};" });

    ok(shouldUpdateReactNativeConfig());
  });

  it("returns true if `react-native-test-app` is mentioned but not used", () => {
    setMockFiles({
      [rnConfigFile]: `// TODO: Use 'react-native-test-app'
module.exports = {};
`,
    });

    ok(shouldUpdateReactNativeConfig());
  });

  it("returns false if `react-native-test-app` is configured", () => {
    setMockFiles({
      [rnConfigFile]: `const { configureProjects } = require("react-native-test-app");
module.exports = {
  project: configureProjects({
    android: {
      sourceDir: "android",
    },
    ios: {
      sourceDir: "ios",
    },
  }),
  dependencies: {
    MyPackage: {
      root: require("node:path").dirname(__dirname),
    },
  },
};
`,
    });

    ok(!shouldUpdateReactNativeConfig());
  });
});
