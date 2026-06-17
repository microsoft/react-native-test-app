// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { findFile, toVersionNumber } from "../scripts/helpers.js";
import { copyFrom } from "../scripts/template.mjs";
import { generateAndroidManifest } from "./android-manifest.js";
import { configureGradleWrapper } from "./gradle-wrapper.js";

/**
 * @import {
 *   Configuration,
 *   ConfigureParams,
 *   ProjectConfig,
 *   ProjectParams,
 * } from "../scripts/types.js";
 */

/**
 * @returns {string}
 */
export function buildGradle() {
  return `buildscript {
    apply(from: {
        def searchDir = rootDir.toPath()
        do {
            def p = searchDir.resolve("node_modules/react-native-test-app/android/dependencies.gradle")
            if (p.toFile().exists()) {
                return p.toRealPath().toString()
            }
        } while (searchDir = searchDir.getParent())
        throw new GradleException("Could not find \`react-native-test-app\`");
    }())

    repositories {
        mavenCentral()
        google()
    }

    dependencies {
        getReactNativeDependencies().each { dependency ->
            classpath(dependency)
        }
    }
}
`;
}

/**
 * @param {number} _targetVersion Target React Native version
 * @returns {string}
 */
export function gradleProperties(_targetVersion) {
  return `# Project-wide Gradle settings.

# IDE (e.g. Android Studio) users:
# Gradle settings configured through the IDE *will override*
# any settings specified in this file.

# For more details on how to configure your build environment visit
# http://www.gradle.org/docs/current/userguide/build_environment.html

# Specifies the JVM arguments used for the Gradle Daemon. The setting is
# particularly useful for configuring JVM memory settings for build performance.
# This does not affect the JVM settings for the Gradle client VM.
# The default is \`-Xmx512m -XX:MaxMetaspaceSize=256m\`.
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

# When configured, Gradle will fork up to org.gradle.workers.max JVMs to execute
# projects in parallel. To learn more about parallel task execution, see the
# section on Gradle build performance:
# https://docs.gradle.org/current/userguide/performance.html#parallel_execution.
# Default is \`false\`.
#org.gradle.parallel=true

# AndroidX package structure to make it clearer which packages are bundled with the
# Android operating system, and which are packaged with your app's APK
# https://developer.android.com/topic/libraries/support-library/androidx-rn
android.useAndroidX=true
# Automatically convert third-party libraries to use AndroidX
#android.enableJetifier=true
# Jetifier randomly fails on these libraries
#android.jetifier.ignorelist=hermes-android,react-android

# Use this property to specify which architecture you want to build.
# You can also override it from the CLI using
# ./gradlew <task> -PreactNativeArchitectures=x86_64
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64

# Use this property to enable support to the new architecture.
# This will allow you to use TurboModules and the Fabric render in
# your application. You should enable this flag either if you want
# to write custom TurboModules/Fabric components OR use libraries that
# are providing them.
# Note that this is incompatible with web debugging.
newArchEnabled=true
#bridgelessEnabled=true

# Uncomment the line below to build React Native from source.
#react.buildFromSource=true

# Version of Android NDK to build against.
#ANDROID_NDK_VERSION=26.1.10909125

# Version of Kotlin to build against.
#KOTLIN_VERSION=1.8.22
`;
}

/**
 * @param {string} name Root project name
 * @returns {string}
 */
export function settingsGradle(name) {
  return `pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
        google()
    }
}

rootProject.name = "${name}"

apply(from: {
    def searchDir = rootDir.toPath()
    do {
        def p = searchDir.resolve("node_modules/react-native-test-app/test-app.gradle")
        if (p.toFile().exists()) {
            return p.toRealPath().toString()
        }
    } while (searchDir = searchDir.getParent())
    throw new GradleException("Could not find \`react-native-test-app\`");
}())
applyTestAppSettings(settings)
`;
}

/**
 * @returns {string | undefined}
 */
export function getAndroidPackageName() {
  return "com.microsoft.reacttestapp";
}

/**
 * @param {string} projectRoot
 * @param {Required<ProjectConfig>["android"]} config
 * @returns {ProjectParams["android"] | undefined}
 */
export function configure(
  projectRoot,
  { packageName, sourceDir },
  fs = nodefs
) {
  const manifestPath = path.join(
    "app",
    "build",
    "generated",
    "rnta",
    "src",
    "main",
    "AndroidManifest.xml"
  );
  const appManifestPath = findFile("app.json", projectRoot, fs);
  if (appManifestPath) {
    const output = path.resolve(projectRoot, sourceDir, manifestPath);
    generateAndroidManifest(appManifestPath, output, fs);
  }

  configureGradleWrapper(sourceDir, fs);

  return {
    sourceDir,
    manifestPath,
    packageName: packageName || getAndroidPackageName(),
  };
}

/**
 * @param {ConfigureParams} params
 * @returns {Configuration}
 */
export function getTemplate({ name, testAppPath, targetVersion }) {
  const targetVersionNum = toVersionNumber(targetVersion);
  return {
    files: {
      "build.gradle": buildGradle(),
      "gradle/wrapper/gradle-wrapper.jar": copyFrom(
        testAppPath,
        "example",
        "android",
        "gradle",
        "wrapper",
        "gradle-wrapper.jar"
      ),
      "gradle/wrapper/gradle-wrapper.properties": copyFrom(
        testAppPath,
        "example",
        "android",
        "gradle",
        "wrapper",
        "gradle-wrapper.properties"
      ),
      "gradle.properties": gradleProperties(targetVersionNum),
      gradlew: copyFrom(testAppPath, "example", "android", "gradlew"),
      "gradlew.bat": copyFrom(testAppPath, "example", "android", "gradlew.bat"),
      "settings.gradle": settingsGradle(name),
    },
    oldFiles: [],
    scripts: {
      android: "react-native run-android",
      "build:android":
        "react-native bundle --entry-file index.js --platform android --dev true --bundle-output dist/main.android.jsbundle --assets-dest dist/res",
    },
    dependencies: {},
  };
}
