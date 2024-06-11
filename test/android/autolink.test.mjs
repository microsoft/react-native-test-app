import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanDependencyName,
  pickAndroidDependencies,
  pruneDependencies,
} from "../../android/autolink.mjs";

/** @typedef {import("@react-native-community/cli-types").Config} Config */

/**
 * @param {unknown} config
 * @returns {Config}
 */
function asConfig(config) {
  return /** @type {Config} */ (config);
}

describe("cleanDependencyName()", () => {
  it("drops @-prefix and replaces invalid characters with '_'", () => {
    equal(
      cleanDependencyName("@react-native-webapis/web-storage"),
      "react-native-webapis_web-storage"
    );
    equal(
      cleanDependencyName("react-native-test-app"),
      "react-native-test-app"
    );
    equal(cleanDependencyName("@!'()*/~"), "_");
    equal(cleanDependencyName("@!'(x)*/~y"), "_x_y");
  });
});

describe("pickAndroidDependencies()", () => {
  const prunedConfig = {
    root: "example",
    dependencies: {
      "@react-native-webapis/web-storage": {
        root: "/~/node_modules/@react-native-webapis/web-storage",
        name: "@react-native-webapis/web-storage",
        platforms: {
          ios: {
            podspecPath:
              "/~/node_modules/@react-native-webapis/web-storage/RNWWebStorage.podspec",
          },
          android: {
            sourceDir:
              "/~/node_modules/@react-native-webapis/web-storage/android",
          },
        },
      },
      "react-native-test-app": {
        root: "/~/node_modules/react-native-test-app",
        name: "react-native-test-app",
        platforms: {
          ios: {
            podspecPath:
              "/~/node_modules/react-native-test-app/ReactTestApp-DevSupport.podspec",
          },
          android: null,
        },
      },
    },
  };

  it("picks Android dependencies", () => {
    deepEqual(pickAndroidDependencies(asConfig(prunedConfig)), {
      ":react-native-webapis_web-storage": {
        projectDir:
          prunedConfig.dependencies["@react-native-webapis/web-storage"]
            .platforms.android.sourceDir,
        configurations: ["implementation"],
      },
    });
  });
});

describe("pruneDependencies()", () => {
  const rawConfig = {
    root: "example",
    dependencies: {
      "@react-native-webapis/web-storage": {
        root: "/~/node_modules/@react-native-webapis/web-storage",
        name: "@react-native-webapis/web-storage",
        platforms: {
          ios: {
            podspecPath:
              "/~/node_modules/@react-native-webapis/web-storage/RNWWebStorage.podspec",
          },
          android: {
            sourceDir:
              "/~/node_modules/@react-native-webapis/web-storage/android",
          },
        },
      },
      react: {
        root: "/~/node_modules/react",
        name: "react",
        platforms: {
          ios: null,
          android: null,
        },
      },
      "react-native": {
        root: "/~/node_modules/react-native",
        name: "react-native",
        platforms: {
          ios: null,
          android: null,
        },
      },
      "react-native-test-app": {
        root: "/~/node_modules/react-native-test-app",
        name: "react-native-test-app",
        platforms: {
          ios: {
            podspecPath:
              "/~/node_modules/react-native-test-app/ReactTestApp-DevSupport.podspec",
          },
          android: null,
        },
      },
    },
  };

  it("drops dependencies that do not contain native code", () => {
    deepEqual(pruneDependencies(asConfig(rawConfig)), {
      root: "example",
      dependencies: {
        "@react-native-webapis/web-storage": {
          root: "/~/node_modules/@react-native-webapis/web-storage",
          name: "@react-native-webapis/web-storage",
          platforms: {
            ios: {
              podspecPath:
                "/~/node_modules/@react-native-webapis/web-storage/RNWWebStorage.podspec",
            },
            android: {
              sourceDir:
                "/~/node_modules/@react-native-webapis/web-storage/android",
            },
          },
        },
        "react-native-test-app": {
          root: "/~/node_modules/react-native-test-app",
          name: "react-native-test-app",
          platforms: {
            ios: {
              podspecPath:
                "/~/node_modules/react-native-test-app/ReactTestApp-DevSupport.podspec",
            },
            android: null,
          },
        },
      },
    });
  });
});
