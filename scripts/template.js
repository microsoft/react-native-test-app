const path = require("path");

/**
 * Joins all specified lines into a single string.
 * @param {...string} lines
 * @returns {string}
 */
function join(...lines) {
  return lines.join("\n");
}

/**
 * @param {string} testAppRelPath Relative path to `react-native-test-app`
 */
function buildGradle(testAppRelPath) {
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
 */
function podfileIOS(name, testAppRelPath) {
  return join(
    `require_relative '${testAppRelPath}/test_app'`,
    "",
    "use_flipper! false unless ENV['USE_FLIPPER'] == '1'",
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
 */
function podfileMacOS(name, testAppRelPath) {
  return join(
    `require_relative '${testAppRelPath}/macos/test_app'`,
    "",
    `workspace '${name}.xcworkspace'`,
    "",
    `use_test_app!`,
    ""
  );
}

function reactNativeConfigAndroidFlat() {
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

function reactNativeConfigAppleFlat() {
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
 */
function reactNativeConfigWindowsFlat(name) {
  return join(
    "const project = (() => {",
    '  const path = require("path");',
    '  const sourceDir = "windows";',
    "  try {",
    '    const { windowsProjectPath } = require("react-native-test-app");',
    "    return {",
    "      windows: {",
    "        sourceDir,",
    `        solutionFile: "${name}.sln",`,
    "        project: windowsProjectPath(path.join(__dirname, sourceDir)),",
    "      },",
    "    };",
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
 */
function settingsGradle(name, testAppRelPath) {
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

exports.buildGradle = buildGradle;
exports.join = join;
exports.podfileIOS = podfileIOS;
exports.podfileMacOS = podfileMacOS;
exports.reactNativeConfigAndroidFlat = reactNativeConfigAndroidFlat;
exports.reactNativeConfigAppleFlat = reactNativeConfigAppleFlat;
exports.reactNativeConfigWindowsFlat = reactNativeConfigWindowsFlat;
exports.settingsGradle = settingsGradle;
