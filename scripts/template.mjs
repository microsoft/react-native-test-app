// @ts-check
import { v } from "./helpers.js";

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
      visionos: ["dist/assets", "dist/main.visionos.jsbundle"],
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
    "        {",
    "            def searchDir = rootDir.toPath()",
    "            do {",
    '                def p = searchDir.resolve("node_modules/react-native/android")',
    "                if (p.toFile().exists()) {",
    "                    maven {",
    "                        url(p.toRealPath().toString())",
    "                    }",
    "                    break",
    "                }",
    "            } while (searchDir = searchDir.getParent())",
    "            // As of 0.80, React Native is no longer installed from npm",
    "        }()",
    "        mavenCentral()",
    "        google()",
    "    }",
    "}",
    ""
  );
}

/**
 * Returns `.bundle/config`.
 *
 * @note We don't use a checked in file because of
 * https://github.com/ruby/setup-ruby/discussions/576.
 *
 * @returns {string}
 */
export function bundleConfig() {
  return join('BUNDLE_PATH: ".bundle"', "BUNDLE_FORCE_RUBY_PLATFORM: 1");
}

/**
 * @param {number} targetVersion Target React Native version
 * @returns {string}
 */
export function gradleProperties(targetVersion) {
  // https://github.com/facebook/react-native/commit/14ccf6bc9c40a51e913bb89a67b114f035bf77cd
  const enableJetifier = targetVersion < v(0, 75, 0) ? "" : "#";
  // https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
  const enableNewArch = targetVersion >= v(0, 76, 0) ? "" : "#";
  return join(
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
    `${enableJetifier}android.enableJetifier=true`,
    "# Jetifier randomly fails on these libraries",
    `${enableJetifier}android.jetifier.ignorelist=hermes-android,react-android`,
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
    `${enableNewArch}newArchEnabled=true`,
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
  );
}

/**
 * @param {string} name Root project name
 * @param {"" | "macos/" | "visionos/"} prefix Platform prefix
 * @param {number} targetVersion Target React Native version
 * @returns {string}
 */
export function podfile(name, prefix, targetVersion) {
  // https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here
  /** @type {Record<typeof prefix, number>} */
  const newArchMatrix = {
    "": v(0, 76, 0),
    "macos/": v(1000, 0, 0),
    "visionos/": v(0, 76, 0),
  };
  const newArchEnabled = targetVersion >= newArchMatrix[prefix];
  return join(
    "ws_dir = Pathname.new(__dir__)",
    "ws_dir = ws_dir.parent until",
    `  File.exist?("#{ws_dir}/node_modules/react-native-test-app/${prefix}test_app.rb") ||`,
    "  ws_dir.expand_path.to_s == '/'",
    `require "#{ws_dir}/node_modules/react-native-test-app/${prefix}test_app.rb"`,
    "",
    `workspace '${name}.xcworkspace'`,
    "",
    `use_test_app! :hermes_enabled => true, :fabric_enabled => ${newArchEnabled}`,
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
