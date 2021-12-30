//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("getConfig()", () => {
  const path = require("path");
  const { mockParams } = require("./mockParams");
  const { getConfig } = require("../../scripts/configure");

  /**
   * Gets the list of dependencies from specified config.
   * @param {import("../../scripts/configure").Configuration} config
   * @param {import("../../scripts/configure").ConfigureParams} params
   * @returns {string[] | undefined}
   */
  function getDependencies({ getDependencies }, params) {
    const dependencies = getDependencies && getDependencies(params);
    return dependencies && Object.keys(dependencies);
  }

  test("returns common scripts and files", () => {
    const params = mockParams();
    const config = getConfig(params, "common");

    expect(Object.keys(config.files).sort()).toEqual([
      ".gitignore",
      ".watchmanconfig",
      "babel.config.js",
      "metro.config.js",
      "react-native.config.js",
    ]);
    expect(config.oldFiles).toEqual([]);
    expect(Object.keys(config.scripts).sort()).toEqual(["start"]);
    expect(getDependencies(config, params)).toEqual([]);
  });

  test("returns more common scripts and files when initializing", () => {
    const params = mockParams({ init: true });
    const config = getConfig(params, "common");

    expect(Object.keys(config.files).sort()).toEqual([
      ".gitignore",
      ".watchmanconfig",
      "App.js",
      "app.json",
      "babel.config.js",
      "index.js",
      "metro.config.js",
      "package.json",
      "react-native.config.js",
    ]);
    expect(config.oldFiles).toEqual([]);
    expect(Object.keys(config.scripts).sort()).toEqual(["start"]);
    expect(getDependencies(config, params)).toEqual([]);
  });

  test("returns Android specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "android");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "android",
      "build:android",
    ]);
    expect(getDependencies(config, params)).toEqual([]);
    expect(Object.keys(config.files).sort()).toEqual([
      "build.gradle",
      "gradle.properties",
      "gradle/wrapper/gradle-wrapper.jar",
      "gradle/wrapper/gradle-wrapper.properties",
      "gradlew",
      "gradlew.bat",
      "settings.gradle",
    ]);
    expect(config.oldFiles).toEqual([]);
  });

  test("returns iOS specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "ios");

    expect(Object.keys(config.scripts).sort()).toEqual(["build:ios", "ios"]);
    expect(getDependencies(config, params)).toEqual([]);
    expect(Object.keys(config.files).sort()).toEqual(["Podfile"]);
    expect(config.oldFiles.sort()).toEqual([
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  test("returns macOS specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "macos");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "build:macos",
      "macos",
    ]);
    expect(Object.keys(config.files).sort()).toEqual(["Podfile"]);
    expect(getDependencies(config, params)).toEqual(["react-native-macos"]);
    expect(config.oldFiles.sort()).toEqual([
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  test("returns Windows specific scripts and additional files", () => {
    const params = mockParams();
    const config = getConfig(params, "windows");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "build:windows",
      "windows",
    ]);
    expect(getDependencies(config, params)).toEqual(["react-native-windows"]);
    expect(Object.keys(config.files).sort()).toEqual([".gitignore"]);
    expect(config.oldFiles.sort()).toEqual([
      "Test.sln",
      "Test.vcxproj",
      path.join("Test", "Test.vcxproj"),
    ]);
  });
});
