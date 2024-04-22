// @ts-check

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
 * @returns {string}
 */
export function buildGradle() {
  return join(
    "buildscript {",
    "    apply(from: {",
    "        def searchDir = rootDir.toPath()",
    "        do {",
    '            def p = searchDir.resolve("node_modules/react-native-test-app/android/dependencies.gradle")',
    "            if (p.toFile().exists()) {",
    "                return p.toRealPath().toString()",
    "            }",
    "        } while (searchDir = searchDir.getParent())",
    '        throw new GradleException("Could not find `react-native-test-app`");',
    "    }())",
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
    // TODO: Remove this block when we drop support for 0.70
    // https://github.com/facebook/react-native/commit/51a48d2e2c64a18012692b063368e369cd8ff797
    "allprojects {",
    "    repositories {",
    "        maven {",
    "            // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm",
    "            url({",
    "                def searchDir = rootDir.toPath()",
    "                do {",
    '                    def p = searchDir.resolve("node_modules/react-native/android")',
    "                    if (p.toFile().exists()) {",
    "                        return p.toRealPath().toString()",
    "                    }",
    "                } while (searchDir = searchDir.getParent())",
    '                throw new GradleException("Could not find `react-native`");',
    "            }())",
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
 * @param {string} prefix Platform prefix
 * @returns {string}
 */
export function podfile(name, prefix) {
  return join(
    "ws_dir = Pathname.new(__dir__)",
    "ws_dir = ws_dir.parent until",
    `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/${prefix}test_app.rb") ||`,
    "  ws_dir.expand_path.to_s == '/'",
    `require "#{ws_dir}/node_modules/react-native-test-app/${prefix}test_app.rb"`,
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
 * @returns {string}
 */
export function settingsGradle(name) {
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
    "apply(from: {",
    "    def searchDir = rootDir.toPath()",
    "    do {",
    '        def p = searchDir.resolve("node_modules/react-native-test-app/test-app.gradle")',
    "        if (p.toFile().exists()) {",
    "            return p.toRealPath().toString()",
    "        }",
    "    } while (searchDir = searchDir.getParent())",
    '    throw new GradleException("Could not find `react-native-test-app`");',
    "}())",
    "applyTestAppSettings(settings)",
    ""
  );
}
