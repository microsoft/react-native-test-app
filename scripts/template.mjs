import * as path from "node:path";

/**
 * Joins all specified lines into a single string.
 * @param {...string} lines
 * @returns {string}
 */
export function join(...lines) {
  return lines.join("\n");
}

/**
 * Converts an object or value to a pretty JSON string.
 * @param {Record<string, unknown>} obj
 * @return {string}
 */
export function serialize(obj) {
  return JSON.stringify(obj, undefined, 2) + "\n";
}

/**
 * @param {string} name
 * @returns {string}
 */
export function appManifest(name) {
  return serialize({
    name,
    displayName: name,
    components: [
      {
        appKey: name,
        displayName: name,
      },
    ],
    resources: {
      android: ["dist/res", "dist/main.android.jsbundle"],
      ios: ["dist/assets", "dist/main.ios.jsbundle"],
      macos: ["dist/assets", "dist/main.macos.jsbundle"],
      windows: ["dist/assets", "dist/main.windows.bundle"],
    },
  });
}

/**
 * @param {string} testAppRelPath Relative path to `react-native-test-app`
 * @returns {string}
 */
export function buildGradle(testAppRelPath) {
  const rnPath = path.posix.join(path.dirname(testAppRelPath), "react-native");
  return join(
    "buildscript {",
    `    def androidTestAppDir = "${testAppRelPath}/android"`,
    '    apply(from: "${androidTestAppDir}/dependencies.gradle")',
    "",
    "    repositories {",
    "        mavenCentral()",
    "        google()",
    "    }",
    "",
    "    dependencies {",
    "        getReactNativeDependencies().each { dependency ->",
    "            classpath(dependency)",
    "        }",
    "    }",
    "}",
    "",
    "allprojects {",
    "    repositories {",
    "        maven {",
    "            // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm",
    `            url("\${rootDir}/${rnPath}/android")`,
    "        }",
    "        mavenCentral()",
    "        google()",
    "    }",
    "}",
    ""
  );
}

/**
 * @param {string} name Root project name
 * @param {string} testAppRelPath Relative path to `react-native-test-app`
 * @returns {string}
 */
export function podfileIOS(name, testAppRelPath) {
  return join(
    `require_relative '${testAppRelPath}/test_app'`,
    "",
    `workspace '${name}.xcworkspace'`,
    "",
    `use_test_app!`,
    ""
  );
}

/**
 * @param {string} name Root project name
 * @param {string} testAppRelPath Relative path to `react-native-test-app`
 * @returns {string}
 */
export function podfileMacOS(name, testAppRelPath) {
  return join(
    `require_relative '${testAppRelPath}/macos/test_app'`,
    "",
    `workspace '${name}.xcworkspace'`,
    "",
    `use_test_app!`,
    ""
  );
}

/**
 * @returns {string}
 */
export function reactNativeConfigAndroidFlat() {
  return join(
    "const project = (() => {",
    "  try {",
    '    const { configureProjects } = require("react-native-test-app");',
    "    return configureProjects({",
    "      android: {",
    '        sourceDir: ".",',
    "      },",
    "    });",
    "  } catch (_) {",
    "    return undefined;",
    "  }",
    "})();",
    "",
    "module.exports = {",
    "  ...(project ? { project } : undefined),",
    "};",
    ""
  );
}

/**
 * @returns {string}
 */
export function reactNativeConfigAppleFlat() {
  return join(
    "const project = (() => {",
    "  try {",
    '    const { configureProjects } = require("react-native-test-app");',
    "    return configureProjects({",
    "      ios: {",
    '        sourceDir: ".",',
    "      },",
    "    });",
    "  } catch (_) {",
    "    return undefined;",
    "  }",
    "})();",
    "",
    "module.exports = {",
    "  ...(project ? { project } : undefined),",
    "};",
    ""
  );
}

/**
 * @param {string} name Solution file name (without extension)
 * @returns {string}
 */
export function reactNativeConfigWindowsFlat(name) {
  return join(
    "const project = (() => {",
    "  try {",
    '    const { configureProjects } = require("react-native-test-app");',
    "    return configureProjects({",
    "      windows: {",
    '        sourceDir: ".",',
    `        solutionFile: "${name}.sln",`,
    "      },",
    "    });",
    "  } catch (_) {",
    "    return undefined;",
    "  }",
    "})();",
    "",
    "module.exports = {",
    "  ...(project ? { project } : undefined),",
    '  reactNativePath: "node_modules/react-native-windows",',
    "};",
    ""
  );
}

/**
 * @param {string} name Root project name
 * @param {string} testAppRelPath Relative path to `react-native-test-app`
 * @returns {string}
 */
export function settingsGradle(name, testAppRelPath) {
  return join(
    "pluginManagement {",
    "    repositories {",
    "        gradlePluginPortal()",
    "        mavenCentral()",
    "        google()",
    "    }",
    "}",
    "",
    `rootProject.name = "${name}"`,
    "",
    `apply(from: "${testAppRelPath}/test-app.gradle")`,
    "applyTestAppSettings(settings)",
    ""
  );
}
