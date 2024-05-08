// @ts-check
import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { gatherConfig as gatherConfigActual } from "../../scripts/configure.mjs";
import { readTextFile } from "../../scripts/helpers.js";
import { join } from "../../scripts/template.mjs";
import { mockParams } from "./mockParams.mjs";

describe("gatherConfig()", () => {
  /**
   * Like `gatherConfig()`, but with normalized newlines and paths.
   *
   * Note that only paths that are used to read/write files are normalized.
   * File content should not be normalized because they should only contain
   * forward-slashes.
   *
   * @param {import("../../scripts/types.js").ConfigureParams} params
   * @returns {import("../../scripts/types.js").Configuration}
   */
  function gatherConfig(params) {
    /** @type {(p: string) => string} */
    const normalize = (p) => p.replace(/\\/g, "/");

    const config = gatherConfigActual(params, true);
    config.files = Object.fromEntries(
      Object.entries(config.files).map(([key, value]) => [
        normalize(key),
        typeof value === "string"
          ? value.replace(/\r/g, "")
          : { source: normalize(value.source) },
      ])
    );
    config.oldFiles = config.oldFiles.map(normalize);
    return config;
  }

  const gradleWrapper = readTextFile(
    "example/android/gradle/wrapper/gradle-wrapper.properties"
  ).replace(/\r/g, "");

  it("returns configuration for all platforms", () => {
    deepEqual(gatherConfig(mockParams()), {
      dependencies: {
        "react-native-macos": "^0.68.0",
        "react-native-windows": "^0.68.0",
      },
      files: {
        ".gitignore": {
          source: "example/.gitignore",
        },
        ".watchmanconfig": {
          source: "node_modules/react-native/template/_watchmanconfig",
        },
        "android/build.gradle": join(
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
        ),
        "android/gradle.properties": {
          source: "example/android/gradle.properties",
        },
        "android/gradle/wrapper/gradle-wrapper.jar": {
          source: "example/android/gradle/wrapper/gradle-wrapper.jar",
        },
        "android/gradle/wrapper/gradle-wrapper.properties": gradleWrapper,
        "android/gradlew": {
          source: "example/android/gradlew",
        },
        "android/gradlew.bat": {
          source: "example/android/gradlew.bat",
        },
        "android/settings.gradle": join(
          "pluginManagement {",
          "    repositories {",
          "        gradlePluginPortal()",
          "        mavenCentral()",
          "        google()",
          "    }",
          "}",
          "",
          'rootProject.name = "Test"',
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
        ),
        "babel.config.js": {
          source: "node_modules/react-native/template/babel.config.js",
        },
        "ios/Podfile": join(
          "ws_dir = Pathname.new(__dir__)",
          "ws_dir = ws_dir.parent until",
          `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/test_app.rb") ||`,
          "  ws_dir.expand_path.to_s == '/'",
          `require "#{ws_dir}/node_modules/react-native-test-app/test_app.rb"`,
          "",
          "workspace 'Test.xcworkspace'",
          "",
          "use_test_app!",
          ""
        ),
        "macos/Podfile": join(
          "ws_dir = Pathname.new(__dir__)",
          "ws_dir = ws_dir.parent until",
          `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/macos/test_app.rb") ||`,
          "  ws_dir.expand_path.to_s == '/'",
          `require "#{ws_dir}/node_modules/react-native-test-app/macos/test_app.rb"`,
          "",
          "workspace 'Test.xcworkspace'",
          "",
          "use_test_app!",
          ""
        ),
        "metro.config.js": {
          source: "example/metro.config.js",
        },
        "react-native.config.js": join(
          "const project = (() => {",
          "  try {",
          '    const { configureProjects } = require("react-native-test-app");',
          "    return configureProjects({",
          "      android: {",
          '        sourceDir: "android",',
          "      },",
          "      ios: {",
          '        sourceDir: "ios",',
          "      },",
          "      windows: {",
          '        sourceDir: "windows",',
          '        solutionFile: "windows/Test.sln",',
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
        ),
        "windows/.gitignore": {
          source: "example/windows/.gitignore",
        },
      },
      oldFiles: [
        "ios/Podfile.lock",
        "ios/Pods",
        "ios/Test.xcodeproj",
        "ios/Test.xcworkspace",
        "macos/Podfile.lock",
        "macos/Pods",
        "macos/Test.xcodeproj",
        "macos/Test.xcworkspace",
        "windows/Test.sln",
        "windows/Test.vcxproj",
        "windows/Test/Test.vcxproj",
      ],
      scripts: {
        android: "react-native run-android",
        "build:android":
          "npm run mkdist && react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
        "build:ios":
          "npm run mkdist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        "build:macos":
          "npm run mkdist && react-native bundle --entry-file index.js --platform macos --dev true --bundle-output dist/main.macos.jsbundle --assets-dest dist",
        "build:windows":
          "npm run mkdist && react-native bundle --entry-file index.js --platform windows --dev true --bundle-output dist/main.windows.bundle --assets-dest dist",
        ios: "react-native run-ios",
        macos: "react-native run-macos --scheme Test",
        mkdist: `node -e "require('node:fs').mkdirSync('dist', { recursive: true, mode: 0o755 })"`,
        start: "react-native start",
        windows: "react-native run-windows --sln windows/Test.sln",
      },
    });
  });

  it("returns common configuration", () => {
    const params = mockParams({ platforms: ["common"] });
    deepEqual(gatherConfig(params), {
      dependencies: {},
      files: {
        ".gitignore": {
          source: "example/.gitignore",
        },
        ".watchmanconfig": {
          source: "node_modules/react-native/template/_watchmanconfig",
        },
        "babel.config.js": {
          source: "node_modules/react-native/template/babel.config.js",
        },
        "common/.gitignore": {
          source: "example/.gitignore",
        },
        "common/.watchmanconfig": {
          source: "node_modules/react-native/template/_watchmanconfig",
        },
        "common/babel.config.js": {
          source: "node_modules/react-native/template/babel.config.js",
        },
        "common/metro.config.js": {
          source: "example/metro.config.js",
        },
        "common/react-native.config.js": join(
          "const project = (() => {",
          "  try {",
          '    const { configureProjects } = require("react-native-test-app");',
          "    return configureProjects({",
          "      android: {",
          '        sourceDir: "android",',
          "      },",
          "      ios: {",
          '        sourceDir: "ios",',
          "      },",
          "      windows: {",
          '        sourceDir: "windows",',
          '        solutionFile: "windows/Test.sln",',
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
        ),
        "metro.config.js": {
          source: "example/metro.config.js",
        },
        "react-native.config.js": join(
          "const project = (() => {",
          "  try {",
          '    const { configureProjects } = require("react-native-test-app");',
          "    return configureProjects({",
          "      android: {",
          '        sourceDir: "android",',
          "      },",
          "      ios: {",
          '        sourceDir: "ios",',
          "      },",
          "      windows: {",
          '        sourceDir: "windows",',
          '        solutionFile: "windows/Test.sln",',
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
        ),
      },
      oldFiles: [],
      scripts: {
        mkdist: `node -e "require('node:fs').mkdirSync('dist', { recursive: true, mode: 0o755 })"`,
        start: "react-native start",
      },
    });
  });

  it("returns configuration for a single platform", () => {
    const params = mockParams({ platforms: ["ios"] });
    deepEqual(gatherConfig(params), {
      dependencies: {},
      files: {
        ".gitignore": {
          source: "example/.gitignore",
        },
        ".watchmanconfig": {
          source: "node_modules/react-native/template/_watchmanconfig",
        },
        "babel.config.js": {
          source: "node_modules/react-native/template/babel.config.js",
        },
        "ios/Podfile": join(
          "ws_dir = Pathname.new(__dir__)",
          "ws_dir = ws_dir.parent until",
          `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/test_app.rb") ||`,
          "  ws_dir.expand_path.to_s == '/'",
          `require "#{ws_dir}/node_modules/react-native-test-app/test_app.rb"`,
          "",
          "workspace 'Test.xcworkspace'",
          "",
          "use_test_app!",
          ""
        ),
        "metro.config.js": {
          source: "example/metro.config.js",
        },
        "react-native.config.js": join(
          "const project = (() => {",
          "  try {",
          '    const { configureProjects } = require("react-native-test-app");',
          "    return configureProjects({",
          "      android: {",
          '        sourceDir: "android",',
          "      },",
          "      ios: {",
          '        sourceDir: "ios",',
          "      },",
          "      windows: {",
          '        sourceDir: "windows",',
          '        solutionFile: "windows/Test.sln",',
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
        ),
      },
      oldFiles: [
        "ios/Podfile.lock",
        "ios/Pods",
        "ios/Test.xcodeproj",
        "ios/Test.xcworkspace",
      ],
      scripts: {
        "build:ios":
          "npm run mkdist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        ios: "react-native run-ios",
        mkdist: `node -e "require('node:fs').mkdirSync('dist', { recursive: true, mode: 0o755 })"`,
        start: "react-native start",
      },
    });
  });

  it("returns configuration for arbitrary platforms", () => {
    const params = mockParams({ platforms: ["android", "ios"] });
    deepEqual(gatherConfig(params), {
      dependencies: {},
      files: {
        ".gitignore": {
          source: "example/.gitignore",
        },
        ".watchmanconfig": {
          source: "node_modules/react-native/template/_watchmanconfig",
        },
        "android/build.gradle": join(
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
        ),
        "android/gradle.properties": {
          source: "example/android/gradle.properties",
        },
        "android/gradle/wrapper/gradle-wrapper.jar": {
          source: "example/android/gradle/wrapper/gradle-wrapper.jar",
        },
        "android/gradle/wrapper/gradle-wrapper.properties": gradleWrapper,
        "android/gradlew": {
          source: "example/android/gradlew",
        },
        "android/gradlew.bat": {
          source: "example/android/gradlew.bat",
        },
        "android/settings.gradle": join(
          "pluginManagement {",
          "    repositories {",
          "        gradlePluginPortal()",
          "        mavenCentral()",
          "        google()",
          "    }",
          "}",
          "",
          'rootProject.name = "Test"',
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
        ),
        "babel.config.js": {
          source: "node_modules/react-native/template/babel.config.js",
        },
        "ios/Podfile": join(
          "ws_dir = Pathname.new(__dir__)",
          "ws_dir = ws_dir.parent until",
          `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/test_app.rb") ||`,
          "  ws_dir.expand_path.to_s == '/'",
          `require "#{ws_dir}/node_modules/react-native-test-app/test_app.rb"`,
          "",
          "workspace 'Test.xcworkspace'",
          "",
          "use_test_app!",
          ""
        ),
        "metro.config.js": {
          source: "example/metro.config.js",
        },
        "react-native.config.js": join(
          "const project = (() => {",
          "  try {",
          '    const { configureProjects } = require("react-native-test-app");',
          "    return configureProjects({",
          "      android: {",
          '        sourceDir: "android",',
          "      },",
          "      ios: {",
          '        sourceDir: "ios",',
          "      },",
          "      windows: {",
          '        sourceDir: "windows",',
          '        solutionFile: "windows/Test.sln",',
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
        ),
      },
      oldFiles: [
        "ios/Podfile.lock",
        "ios/Pods",
        "ios/Test.xcodeproj",
        "ios/Test.xcworkspace",
      ],
      scripts: {
        android: "react-native run-android",
        "build:android":
          "npm run mkdist && react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
        "build:ios":
          "npm run mkdist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        ios: "react-native run-ios",
        mkdist: `node -e "require('node:fs').mkdirSync('dist', { recursive: true, mode: 0o755 })"`,
        start: "react-native start",
      },
    });
  });

  it("flattens configuration for a single platform only", () => {
    const iosOnly = mockParams({ platforms: ["ios"], flatten: true });
    deepEqual(gatherConfig(iosOnly), {
      dependencies: {},
      files: {
        ".gitignore": {
          source: "example/.gitignore",
        },
        ".watchmanconfig": {
          source: "node_modules/react-native/template/_watchmanconfig",
        },
        Podfile: join(
          "ws_dir = Pathname.new(__dir__)",
          "ws_dir = ws_dir.parent until",
          `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/test_app.rb") ||`,
          "  ws_dir.expand_path.to_s == '/'",
          `require "#{ws_dir}/node_modules/react-native-test-app/test_app.rb"`,
          "",
          "workspace 'Test.xcworkspace'",
          "",
          "use_test_app!",
          ""
        ),
        "babel.config.js": {
          source: "node_modules/react-native/template/babel.config.js",
        },
        "metro.config.js": {
          source: "example/metro.config.js",
        },
        "react-native.config.js": join(
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
        ),
      },
      oldFiles: ["Podfile.lock", "Pods", "Test.xcodeproj", "Test.xcworkspace"],
      scripts: {
        "build:ios":
          "npm run mkdist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        ios: "react-native run-ios",
        mkdist: `node -e "require('node:fs').mkdirSync('dist', { recursive: true, mode: 0o755 })"`,
        start: "react-native start",
      },
    });

    const mobile = mockParams({ platforms: ["android", "ios"], flatten: true });
    deepEqual(gatherConfig(mobile), {
      dependencies: {},
      files: {
        ".gitignore": {
          source: "example/.gitignore",
        },
        ".watchmanconfig": {
          source: "node_modules/react-native/template/_watchmanconfig",
        },
        "android/build.gradle": join(
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
        ),
        "android/gradle.properties": {
          source: "example/android/gradle.properties",
        },
        "android/gradle/wrapper/gradle-wrapper.jar": {
          source: "example/android/gradle/wrapper/gradle-wrapper.jar",
        },
        "android/gradle/wrapper/gradle-wrapper.properties": gradleWrapper,
        "android/gradlew": {
          source: "example/android/gradlew",
        },
        "android/gradlew.bat": {
          source: "example/android/gradlew.bat",
        },
        "android/settings.gradle": join(
          "pluginManagement {",
          "    repositories {",
          "        gradlePluginPortal()",
          "        mavenCentral()",
          "        google()",
          "    }",
          "}",
          "",
          'rootProject.name = "Test"',
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
        ),
        "babel.config.js": {
          source: "node_modules/react-native/template/babel.config.js",
        },
        "ios/Podfile": join(
          "ws_dir = Pathname.new(__dir__)",
          "ws_dir = ws_dir.parent until",
          `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/test_app.rb") ||`,
          "  ws_dir.expand_path.to_s == '/'",
          `require "#{ws_dir}/node_modules/react-native-test-app/test_app.rb"`,
          "",
          "workspace 'Test.xcworkspace'",
          "",
          "use_test_app!",
          ""
        ),
        "metro.config.js": {
          source: "example/metro.config.js",
        },
        "react-native.config.js": join(
          "const project = (() => {",
          "  try {",
          '    const { configureProjects } = require("react-native-test-app");',
          "    return configureProjects({",
          "      android: {",
          '        sourceDir: "android",',
          "      },",
          "      ios: {",
          '        sourceDir: "ios",',
          "      },",
          "      windows: {",
          '        sourceDir: "windows",',
          '        solutionFile: "windows/Test.sln",',
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
        ),
      },
      oldFiles: [
        "ios/Podfile.lock",
        "ios/Pods",
        "ios/Test.xcodeproj",
        "ios/Test.xcworkspace",
      ],
      scripts: {
        android: "react-native run-android",
        "build:android":
          "npm run mkdist && react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
        "build:ios":
          "npm run mkdist && react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        ios: "react-native run-ios",
        mkdist: `node -e "require('node:fs').mkdirSync('dist', { recursive: true, mode: 0o755 })"`,
        start: "react-native start",
      },
    });
  });
});
