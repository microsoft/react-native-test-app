// @ts-check
"use strict";

describe("test-app-util", () => {
  const { removeProject, runGradleWithProject } = require("./gradle");

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
    '        classpath("com.android.tools.build:gradle:${androidPluginVersion}")',
    '        classpath("de.undercouch:gradle-download-task:5.1.2")',
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

  afterAll(() => {
    removeProject(defaultTestProject);
  });

  test("getAppName() returns `name` if `displayName` is omitted", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
      }),
      "build.gradle": [
        ...buildGradle,
        'println("getAppName() = " + ext.getAppName())',
      ],
    });

    expect(status).toBe(0);
    expect(stdout).toContain("getAppName() = AppName");
  });

  test("getAppName() returns `displayName` if set", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toContain("getAppName() = AppDisplayName");
  });

  test("getApplicationId() returns default id", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toContain("getApplicationId() = com.microsoft.reacttestapp");
  });

  test("getApplicationId() returns package name", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toContain("getApplicationId() = com.contoso.application.id");
  });

  test("getFlipperRecommendedVersion() returns `null` if unsupported", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperRecommendedVersion() = " + ext.getFlipperRecommendedVersion(file("${rootDir}/no-flipper")))',
      ],
      "no-flipper/node_modules/react-native/template/android/gradle.properties":
        "",
    });

    expect(status).toBe(0);
    expect(stdout).toContain("getFlipperRecommendedVersion() = null");
  });

  test("getFlipperRecommendedVersion() returns version number if supported", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperRecommendedVersion() = " + ext.getFlipperRecommendedVersion(rootDir))',
      ],
    });

    expect(status).toBe(0);
    expect(stdout).toMatch(/getFlipperRecommendedVersion\(\) = \d+\.\d+\.\d+/);
  });

  test("getFlipperVersion() returns `null` if unsupported", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperVersion() = " + ext.getFlipperVersion(file("${rootDir}/no-flipper")))',
      ],
      "no-flipper/node_modules/react-native/template/android/gradle.properties":
        "",
    });

    expect(status).toBe(0);
    expect(stdout).toContain("getFlipperVersion() = null");
  });

  test("getFlipperVersion() returns recommended version if unset", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getFlipperVersion() = " + ext.getFlipperVersion(rootDir))',
      ],
    });

    expect(status).toBe(0);
    expect(stdout).toMatch(/getFlipperVersion\(\) = \d+\.\d+\.\d+/);
  });

  test("getFlipperVersion() returns user set version", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toContain("getFlipperVersion() = 0.0.0-test");
  });

  test("getFlipperVersion() returns null if disabled", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toContain("getFlipperVersion() = null");
  });

  test("getPackageVersionNumber() returns `react-native` version as a number", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getPackageVersionNumber() = " + ext.getPackageVersionNumber("react-native", rootDir))',
      ],
    });

    expect(status).toBe(0);

    const { version } = require("react-native/package.json");

    expect(stdout).toContain(
      `getPackageVersionNumber() = ${toVersionNumber(version)}`
    );
  });

  test("getPackageVersionNumber() handles pre-release identifiers", async () => {
    const { status, stdout } = await runGradle({
      "build.gradle": [
        ...buildGradle,
        'println("getPackageVersionNumber() = " + ext.getPackageVersionNumber("react-native", file("${rootDir}/pre-release-version")))',
      ],
      "pre-release-version/node_modules/react-native/package.json":
        JSON.stringify({ name: "react-native", version: "1.2.3-053c2b4be" }),
    });

    expect(status).toBe(0);
    expect(stdout).toContain(`getPackageVersionNumber() = 10203`);
  });

  test("getSigningConfigs() fails if `storeFile` is missing", async () => {
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

    expect(status).toBe(1);
    expect(stderr).toMatch(/storeFile .* is missing/);
  });

  test("getSigningConfigs() skips empty `signingConfigs` config", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toContain("getSigningConfigs() = [:]");
  });

  test("getSigningConfigs() returns debug signing config", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toMatch(
      /getSigningConfigs\(\) = \[debug:\[keyAlias:androiddebugkey, keyPassword:android, storePassword:android, storeFile:.*\]\]/
    );
  });

  test("getSigningConfigs() returns release signing config", async () => {
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

    expect(status).toBe(0);
    expect(stdout).toMatch(
      /getSigningConfigs\(\) = \[release:\[keyAlias:androiddebugkey, keyPassword:android, storePassword:android, storeFile:.*\]\]/
    );
  });
});
