// @ts-check
import { deepEqual } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  getConfig as getConfigActual,
  getPlatformPackage,
} from "../../scripts/configure.mjs";
import { mockParams } from "./mockParams.mjs";

describe("getConfig()", () => {
  /** @type {typeof getConfigActual} */
  const getConfig = (params, platform) =>
    getConfigActual(params, platform, true);

  /**
   * Gets the list of dependencies from specified config.
   * @param {import("../../scripts/types").Platform} platform
   * @param {import("../../scripts/types").ConfigureParams} params
   * @returns {string[] | undefined}
   */
  function getDependencies(platform, { targetVersion }) {
    const dependencies = getPlatformPackage(platform, targetVersion);
    return dependencies && Object.keys(dependencies);
  }

  it("returns common scripts and files", () => {
    const params = mockParams();
    const config = getConfig(params, "common");

    deepEqual(Object.keys(config.files).sort(), [
      ".gitignore",
      ".watchmanconfig",
      "babel.config.js",
      "metro.config.js",
      "react-native.config.js",
    ]);
    deepEqual(config.oldFiles, []);
    deepEqual(Object.keys(config.scripts).sort(), ["start"]);
    deepEqual(getDependencies("common", params), []);
  });

  it("returns more common scripts and files when initializing", () => {
    const params = mockParams({ init: true });
    const config = getConfig(params, "common");

    deepEqual(Object.keys(config.files).sort(), [
      ".gitignore",
      ".watchmanconfig",
      "App.tsx",
      "app.json",
      "babel.config.js",
      "index.js",
      "metro.config.js",
      "package.json",
      "react-native.config.js",
      "tsconfig.json",
    ]);
    deepEqual(config.oldFiles, []);
    deepEqual(Object.keys(config.scripts).sort(), ["start"]);
    deepEqual(getDependencies("common", params), []);
  });

  it("returns Android specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "android");

    deepEqual(Object.keys(config.scripts).sort(), ["android", "build:android"]);
    deepEqual(getDependencies("android", params), []);
    deepEqual(Object.keys(config.files).sort(), [
      "build.gradle",
      "gradle.properties",
      "gradle/wrapper/gradle-wrapper.jar",
      "gradle/wrapper/gradle-wrapper.properties",
      "gradlew",
      "gradlew.bat",
      "settings.gradle",
    ]);
    deepEqual(config.oldFiles, []);
  });

  it("returns iOS specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "ios");

    deepEqual(Object.keys(config.scripts).sort(), ["build:ios", "ios"]);
    deepEqual(getDependencies("ios", params), []);
    deepEqual(Object.keys(config.files).sort(), ["Podfile"]);
    deepEqual(config.oldFiles.sort(), [
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  it("returns macOS specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "macos");

    deepEqual(Object.keys(config.scripts).sort(), ["build:macos", "macos"]);
    deepEqual(Object.keys(config.files).sort(), ["Podfile"]);
    deepEqual(getDependencies("macos", params), ["react-native-macos"]);
    deepEqual(config.oldFiles.sort(), [
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  it("returns Windows specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "windows");

    deepEqual(Object.keys(config.scripts).sort(), ["build:windows", "windows"]);
    deepEqual(getDependencies("windows", params), ["react-native-windows"]);
    deepEqual(Object.keys(config.files).sort(), [".gitignore"]);
    deepEqual(config.oldFiles.sort(), [
      "Test.sln",
      "Test.vcxproj",
      path.join("Test", "Test.vcxproj"),
    ]);
  });
});
