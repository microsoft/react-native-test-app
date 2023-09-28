// @ts-check
import { equal, match } from "node:assert/strict";
import { after, describe, it } from "node:test";
import {
  reactNativeVersion,
  removeProject,
  runGradleWithProject,
} from "./gradle.mjs";

describe("test-app-util.gradle", () => {
  const buildGradle = [
    "buildscript {",
    '    def androidTestAppDir = "node_modules/react-native-test-app/android"',
    '    apply(from: "${androidTestAppDir}/dependencies.gradle")',
    '    apply(from: "${androidTestAppDir}/test-app-util.gradle")',
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
  ];

  const defaultTestProject = "TestAppUtilTest";

  /**
   * Runs Gradle in test project.
   * @param {Record<string, string | string[]>=} setupFiles
   */
  function runGradle(setupFiles) {
    return runGradleWithProject(defaultTestProject, ["android"], setupFiles);
  }

  /**
   * Returns version number.
   * @param {string} version
   * @returns
   */
  function toVersionNumber(version) {
    const [major, minor, patch] = version.split("-")[0].split(".");
    return Number(major) * 10000 + Number(minor) * 100 + Number(patch);
  }

  after(() => removeProject(defaultTestProject));

  it("getAppName() returns `displayName`", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getAppName() = " + ext.getAppName())',
      ],
    });

    equal(status, 0);
    match(stdout, /getAppName\(\) = AppDisplayName/);
  });

  it("getApplicationId() returns default id", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getApplicationId() = " + ext.getApplicationId())',
      ],
    });

    equal(status, 0);
    match(stdout, /getApplicationId\(\) = com.microsoft.reacttestapp/);
  });

  it("getApplicationId() returns package name", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        android: {
          package: "com.contoso.application.id",
        },
        resources: ["dist/res", "dist/main.android.jsbundle"],
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getApplicationId() = " + ext.getApplicationId())',
      ],
    });

    equal(status, 0);
    match(stdout, /getApplicationId\(\) = com.contoso.application.id/);
  });

  it("getFlipperRecommendedVersion() returns `null` if unsupported", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperRecommendedVersion() = " + ext.getFlipperRecommendedVersion(file("${rootDir}/no-flipper")))',
      ],
      "no-flipper/node_modules/react-native/template/android/gradle.properties":
        "",
    });

    equal(status, 0);
    match(stdout, /getFlipperRecommendedVersion\(\) = null/);
  });

  it("getFlipperRecommendedVersion() returns version number if supported", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperRecommendedVersion() = " + ext.getFlipperRecommendedVersion(rootDir))',
      ],
    });

    equal(status, 0);
    match(stdout, /getFlipperRecommendedVersion\(\) = \d+\.\d+\.\d+/);
  });

  it("getFlipperVersion() returns `null` if unsupported", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperVersion() = " + ext.getFlipperVersion(file("${rootDir}/no-flipper")))',
      ],
      "no-flipper/node_modules/react-native/template/android/gradle.properties":
        "",
    });

    equal(status, 0);
    match(stdout, /getFlipperVersion\(\) = null/);
  });

  it("getFlipperVersion() returns recommended version if unset", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperVersion() = " + ext.getFlipperVersion(rootDir))',
      ],
    });

    equal(status, 0);
    match(stdout, /getFlipperVersion\(\) = \d+\.\d+\.\d+/);
  });

  it("getFlipperVersion() returns user set version", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperVersion() = " + ext.getFlipperVersion(rootDir))',
      ],
      "gradle.properties": [
        "android.useAndroidX=true",
        "android.enableJetifier=true",
        "FLIPPER_VERSION=0.0.0-test",
      ],
    });

    equal(status, 0);
    match(stdout, /getFlipperVersion\(\) = 0.0.0-test/);
  });

  it("getFlipperVersion() returns null if disabled", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperVersion() = " + ext.getFlipperVersion(rootDir))',
      ],
      "gradle.properties": [
        "android.useAndroidX=true",
        "android.enableJetifier=true",
        "FLIPPER_VERSION=false",
      ],
    });

    equal(status, 0);
    match(stdout, /getFlipperVersion\(\) = null/);
  });

  it("getPackageVersionNumber() returns `react-native` version as a number", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getPackageVersionNumber() = " + ext.getPackageVersionNumber("react-native", rootDir))',
      ],
    });

    const versionNumber = toVersionNumber(reactNativeVersion());

    equal(status, 0);
    match(
      stdout,
      new RegExp(`getPackageVersionNumber\\(\\) = ${versionNumber}`)
    );
  });

  it("getPackageVersionNumber() handles pre-release identifiers", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getPackageVersionNumber() = " + ext.getPackageVersionNumber("react-native", file("${rootDir}/pre-release-version")))',
      ],
      "pre-release-version/node_modules/react-native/package.json":
        JSON.stringify({ name: "react-native", version: "1.2.3-053c2b4be" }),
    });

    equal(status, 0);
    match(stdout, /getPackageVersionNumber\(\) = 10203/);
  });

  it("getSigningConfigs() fails if `storeFile` is missing", async () => {
    const { status, stderr } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
        android: { signingConfigs: { debug: {} } },
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getSigningConfigs() = " + ext.getSigningConfigs())',
      ],
    });

    equal(status, 1);
    match(stderr, /storeFile .* is missing/);
  });

  it("getSigningConfigs() skips empty `signingConfigs` config", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
        android: { signingConfigs: {} },
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getSigningConfigs() = " + ext.getSigningConfigs())',
      ],
    });

    equal(status, 0);
    match(stdout, /getSigningConfigs\(\) = \[:\]/);
  });

  it("getSigningConfigs() returns debug signing config", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
        android: {
          signingConfigs: {
            debug: {
              storeFile: "../README.md",
            },
          },
        },
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getSigningConfigs() = " + ext.getSigningConfigs())',
      ],
    });

    equal(status, 0);
    match(
      stdout,
      /getSigningConfigs\(\) = \[debug:\[keyAlias:androiddebugkey, keyPassword:android, storePassword:android, storeFile:.*\]\]/
    );
  });

  it("getSigningConfigs() returns release signing config", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
        android: {
          signingConfigs: {
            release: {
              storeFile: "../README.md",
            },
          },
        },
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getSigningConfigs() = " + ext.getSigningConfigs())',
      ],
    });

    equal(status, 0);
    match(
      stdout,
      /getSigningConfigs\(\) = \[release:\[keyAlias:androiddebugkey, keyPassword:android, storePassword:android, storeFile:.*\]\]/
    );
  });
});
