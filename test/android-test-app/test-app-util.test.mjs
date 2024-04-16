// @ts-check
import { equal, match } from "node:assert/strict";
import * as os from "node:os";
import { after, describe, it } from "node:test";
import { toVersionNumber, v } from "../../scripts/helpers.js";
import {
  reactNativeVersion,
  removeProject,
  runGradleWithProject,
} from "./gradle.mjs";

// TODO: These tests are broken on GitHub Actions (Windows) as of 20240414.1.0
// https://github.com/actions/runner-images/commit/16c64c111cb6372bf8949332d275b74c87d33075
describe("test-app-util.gradle", { skip: os.platform() === "win32" }, () => {
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
    match(stdout, new RegExp(`getPackageVersionNumber\\(\\) = ${v(1, 2, 3)}`));
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
