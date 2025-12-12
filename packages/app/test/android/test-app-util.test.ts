import { equal, match } from "node:assert/strict";
import { after, describe, it } from "node:test";
import { toVersionNumber, v } from "../../scripts/helpers.js";
import {
  buildGradle,
  reactNativeVersion,
  removeProject,
  runGradleWithProject,
} from "./gradle.ts";

describe("test-app-util.gradle", () => {
  const defaultTestProject = "TestAppUtilTest";

  /**
   * Runs Gradle in test project.
   */
  function runGradle(
    setupFiles: Record<string, string | string[]> | undefined
  ) {
    return runGradleWithProject(defaultTestProject, ["android"], setupFiles);
  }

  after(() => {
    removeProject(defaultTestProject);
  });

  it("getAppName() returns `displayName`", async () => {
    const { status, stdout } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
      }),
      "android/build.gradle": buildGradle(
        'println("getAppName() = " + project.ext.getAppName())'
      ),
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
      "android/build.gradle": buildGradle(
        'println("getApplicationId() = " + project.ext.getApplicationId())'
      ),
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
      "android/build.gradle": buildGradle(
        'println("getApplicationId() = " + project.ext.getApplicationId())'
      ),
    });

    equal(status, 0);
    match(stdout, /getApplicationId\(\) = com.contoso.application.id/);
  });

  it("getPackageVersionNumber() returns `react-native` version as a number", async () => {
    const { status, stdout } = await runGradle({
      "android/build.gradle": buildGradle(
        'println("getPackageVersionNumber() = " + project.ext.getPackageVersionNumber("react-native", rootDir))'
      ),
    });

    const versionNumber = toVersionNumber(reactNativeVersion());

    equal(status, 0);
    match(
      stdout,
      new RegExp(`getPackageVersionNumber\\(\\) = ${versionNumber}`)
    );
  });

  it("getSigningConfigs() fails if `storeFile` is missing", async () => {
    const { status, stderr } = await runGradle({
      "app.json": JSON.stringify({
        name: "AppName",
        displayName: "AppDisplayName",
        resources: ["dist/res", "dist/main.android.jsbundle"],
        android: { signingConfigs: { debug: {} } },
      }),
      "android/build.gradle": buildGradle(
        'println("getSigningConfigs() = " + project.ext.getSigningConfigs())'
      ),
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
      "android/build.gradle": buildGradle(
        'println("getSigningConfigs() = " + project.ext.getSigningConfigs())'
      ),
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
      "android/build.gradle": buildGradle(
        'println("getSigningConfigs() = " + project.ext.getSigningConfigs())'
      ),
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
      "android/build.gradle": buildGradle(
        'println("getSigningConfigs() = " + project.ext.getSigningConfigs())'
      ),
    });

    equal(status, 0);
    match(
      stdout,
      /getSigningConfigs\(\) = \[release:\[keyAlias:androiddebugkey, keyPassword:android, storePassword:android, storeFile:.*\]\]/
    );
  });

  it("toVersionNumber() handles pre-release identifiers", async () => {
    const { status, stdout } = await runGradle({
      "android/build.gradle": buildGradle(
        'println("toVersionNumber() = " + project.ext.toVersionNumber("1.2.3-053c2b4be"))'
      ),
    });

    equal(status, 0);
    match(stdout, new RegExp(`toVersionNumber\\(\\) = ${v(1, 2, 3)}`));
  });
});
