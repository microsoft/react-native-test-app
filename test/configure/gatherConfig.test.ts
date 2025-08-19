import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { gatherConfig as gatherConfigActual } from "../../scripts/configure.mjs";
import { join } from "../../scripts/template.mjs";
import type { Configuration, ConfigureParams } from "../../scripts/types.ts";
import { templatePath } from "../template.ts";
import { mockParams } from "./mockParams.ts";

describe("gatherConfig()", () => {
  const templateDir = templatePath.substring(
    templatePath.lastIndexOf("node_modules")
  );

  /**
   * Like `gatherConfig()`, but with normalized newlines and paths.
   *
   * Note that only paths that are used to read/write files are normalized.
   * File content should not be normalized because they should only contain
   * forward-slashes.
   */
  function gatherConfig(params: ConfigureParams): Configuration {
    const normalize = (p: string) => p.replaceAll("\\", "/");

    const config = gatherConfigActual({ ...params, templatePath }, true);
    config.files = Object.fromEntries(
      Object.entries(config.files).map(([key, value]) => [
        normalize(key),
        typeof value === "string"
          ? value.replaceAll("\r", "")
          : { source: normalize(value.source) },
      ])
    );
    config.oldFiles = config.oldFiles.map(normalize);
    return config;
  }

  it("returns configuration for all platforms", () => {
    deepEqual(gatherConfig(mockParams()), {
      dependencies: {
        "react-native-macos": "^0.76.0",
        "react-native-windows": "^0.76.0",
      },
      files: {
        ".gitignore": {
          source: "example/.gitignore",
        },
        ".watchmanconfig": {
          source: `${templateDir}/_watchmanconfig`,
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
          ""
        ),
        "android/gradle.properties": join(
          "# Project-wide Gradle settings.",
          "",
          "# IDE (e.g. Android Studio) users:",
          "# Gradle settings configured through the IDE *will override*",
          "# any settings specified in this file.",
          "",
          "# For more details on how to configure your build environment visit",
          "# http://www.gradle.org/docs/current/userguide/build_environment.html",
          "",
          "# Specifies the JVM arguments used for the Gradle Daemon. The setting is",
          "# particularly useful for configuring JVM memory settings for build performance.",
          "# This does not affect the JVM settings for the Gradle client VM.",
          "# The default is `-Xmx512m -XX:MaxMetaspaceSize=256m`.",
          "org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8",
          "",
          "# When configured, Gradle will fork up to org.gradle.workers.max JVMs to execute",
          "# projects in parallel. To learn more about parallel task execution, see the",
          "# section on Gradle build performance:",
          "# https://docs.gradle.org/current/userguide/performance.html#parallel_execution.",
          "# Default is `false`.",
          "#org.gradle.parallel=true",
          "",
          "# AndroidX package structure to make it clearer which packages are bundled with the",
          "# Android operating system, and which are packaged with your app's APK",
          "# https://developer.android.com/topic/libraries/support-library/androidx-rn",
          "android.useAndroidX=true",
          "# Automatically convert third-party libraries to use AndroidX",
          "#android.enableJetifier=true",
          "# Jetifier randomly fails on these libraries",
          "#android.jetifier.ignorelist=hermes-android,react-android",
          "",
          "# Use this property to specify which architecture you want to build.",
          "# You can also override it from the CLI using",
          "# ./gradlew <task> -PreactNativeArchitectures=x86_64",
          "reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64",
          "",
          "# Use this property to enable support to the new architecture.",
          "# This will allow you to use TurboModules and the Fabric render in",
          "# your application. You should enable this flag either if you want",
          "# to write custom TurboModules/Fabric components OR use libraries that",
          "# are providing them.",
          "# Note that this is incompatible with web debugging.",
          "newArchEnabled=true",
          "#bridgelessEnabled=true",
          "",
          "# Uncomment the line below to build React Native from source.",
          "#react.buildFromSource=true",
          "",
          "# Version of Android NDK to build against.",
          "#ANDROID_NDK_VERSION=26.1.10909125",
          "",
          "# Version of Kotlin to build against.",
          "#KOTLIN_VERSION=1.8.22"
        ),
        "android/gradle/wrapper/gradle-wrapper.jar": {
          source: "example/android/gradle/wrapper/gradle-wrapper.jar",
        },
        "android/gradle/wrapper/gradle-wrapper.properties": {
          source: "example/android/gradle/wrapper/gradle-wrapper.properties",
        },
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
          source: `${templateDir}/babel.config.js`,
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
          "use_test_app! :hermes_enabled => true, :fabric_enabled => true",
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
          "use_test_app! :hermes_enabled => true, :fabric_enabled => false",
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
          "react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
        "build:ios":
          "react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        "build:macos":
          "react-native bundle --entry-file index.js --platform macos --dev true --bundle-output dist/main.macos.jsbundle --assets-dest dist",
        "build:windows":
          "react-native bundle --entry-file index.js --platform windows --dev true --bundle-output dist/main.windows.bundle --assets-dest dist",
        ios: "react-native run-ios",
        macos: "react-native run-macos --scheme Test",
        start: "react-native start",
        windows: "react-native run-windows",
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
          source: `${templateDir}/_watchmanconfig`,
        },
        "babel.config.js": {
          source: `${templateDir}/babel.config.js`,
        },
        "common/.gitignore": {
          source: "example/.gitignore",
        },
        "common/.watchmanconfig": {
          source: `${templateDir}/_watchmanconfig`,
        },
        "common/babel.config.js": {
          source: `${templateDir}/babel.config.js`,
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
          source: `${templateDir}/_watchmanconfig`,
        },
        "babel.config.js": {
          source: `${templateDir}/babel.config.js`,
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
          "use_test_app! :hermes_enabled => true, :fabric_enabled => true",
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
          "react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        ios: "react-native run-ios",
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
          source: `${templateDir}/_watchmanconfig`,
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
          ""
        ),
        "android/gradle.properties": join(
          "# Project-wide Gradle settings.",
          "",
          "# IDE (e.g. Android Studio) users:",
          "# Gradle settings configured through the IDE *will override*",
          "# any settings specified in this file.",
          "",
          "# For more details on how to configure your build environment visit",
          "# http://www.gradle.org/docs/current/userguide/build_environment.html",
          "",
          "# Specifies the JVM arguments used for the Gradle Daemon. The setting is",
          "# particularly useful for configuring JVM memory settings for build performance.",
          "# This does not affect the JVM settings for the Gradle client VM.",
          "# The default is `-Xmx512m -XX:MaxMetaspaceSize=256m`.",
          "org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8",
          "",
          "# When configured, Gradle will fork up to org.gradle.workers.max JVMs to execute",
          "# projects in parallel. To learn more about parallel task execution, see the",
          "# section on Gradle build performance:",
          "# https://docs.gradle.org/current/userguide/performance.html#parallel_execution.",
          "# Default is `false`.",
          "#org.gradle.parallel=true",
          "",
          "# AndroidX package structure to make it clearer which packages are bundled with the",
          "# Android operating system, and which are packaged with your app's APK",
          "# https://developer.android.com/topic/libraries/support-library/androidx-rn",
          "android.useAndroidX=true",
          "# Automatically convert third-party libraries to use AndroidX",
          "#android.enableJetifier=true",
          "# Jetifier randomly fails on these libraries",
          "#android.jetifier.ignorelist=hermes-android,react-android",
          "",
          "# Use this property to specify which architecture you want to build.",
          "# You can also override it from the CLI using",
          "# ./gradlew <task> -PreactNativeArchitectures=x86_64",
          "reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64",
          "",
          "# Use this property to enable support to the new architecture.",
          "# This will allow you to use TurboModules and the Fabric render in",
          "# your application. You should enable this flag either if you want",
          "# to write custom TurboModules/Fabric components OR use libraries that",
          "# are providing them.",
          "# Note that this is incompatible with web debugging.",
          "newArchEnabled=true",
          "#bridgelessEnabled=true",
          "",
          "# Uncomment the line below to build React Native from source.",
          "#react.buildFromSource=true",
          "",
          "# Version of Android NDK to build against.",
          "#ANDROID_NDK_VERSION=26.1.10909125",
          "",
          "# Version of Kotlin to build against.",
          "#KOTLIN_VERSION=1.8.22"
        ),
        "android/gradle/wrapper/gradle-wrapper.jar": {
          source: "example/android/gradle/wrapper/gradle-wrapper.jar",
        },
        "android/gradle/wrapper/gradle-wrapper.properties": {
          source: "example/android/gradle/wrapper/gradle-wrapper.properties",
        },
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
          source: `${templateDir}/babel.config.js`,
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
          "use_test_app! :hermes_enabled => true, :fabric_enabled => true",
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
          "react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
        "build:ios":
          "react-native bundle --entry-file index.js --platform ios --dev true --bundle-output dist/main.ios.jsbundle --assets-dest dist",
        ios: "react-native run-ios",
        start: "react-native start",
      },
    });
  });
});
