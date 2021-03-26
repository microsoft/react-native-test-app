//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("getConfig()", () => {
  const { mockParams } = require("./mockParams");
  const { getConfig } = require("../../scripts/configure");

  test("returns common scripts and files", () => {
    const config = getConfig(mockParams(), "common");

    expect(Object.keys(config.files).sort()).toEqual([
      ".watchmanconfig",
      "babel.config.js",
      "metro.config.js",
      "metro.config.windows.js",
      "react-native.config.js",
    ]);
    expect(config.oldFiles).toEqual([]);
    expect(Object.keys(config.scripts).sort()).toEqual(["start"]);
    expect(Object.keys(config.dependencies)).toEqual([]);
  });

  test("returns more common scripts and files when initializing", () => {
    const config = getConfig(mockParams({ init: true }), "common");

    expect(Object.keys(config.files).sort()).toEqual([
      ".watchmanconfig",
      "App.js",
      "app.json",
      "babel.config.js",
      "index.js",
      "metro.config.js",
      "metro.config.windows.js",
      "package.json",
      "react-native.config.js",
    ]);
    expect(config.oldFiles).toEqual([]);
    expect(Object.keys(config.scripts).sort()).toEqual(["start"]);
    expect(Object.keys(config.dependencies)).toEqual([]);
  });

  test("returns Android specific scripts and additional files", () => {
    const config = getConfig(mockParams(), "android");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "android",
      "build:android",
    ]);
    expect(Object.keys(config.dependencies)).toEqual([]);
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
    const config = getConfig(mockParams(), "ios");

    expect(Object.keys(config.scripts).sort()).toEqual(["build:ios", "ios"]);
    expect(Object.keys(config.dependencies)).toEqual([]);
    expect(Object.keys(config.files).sort()).toEqual(["Podfile"]);
    expect(config.oldFiles.sort()).toEqual([
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  test("returns macOS specific scripts and additional files", () => {
    const config = getConfig(mockParams(), "macos");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "build:macos",
      "macos",
    ]);
    expect(Object.keys(config.files).sort()).toEqual(["Podfile"]);
    expect(Object.keys(config.dependencies)).toEqual(["react-native-macos"]);
    expect(config.oldFiles.sort()).toEqual([
      "Podfile.lock",
      "Pods",
      "Test.xcodeproj",
      "Test.xcworkspace",
    ]);
  });

  test("returns Windows specific scripts and additional files", () => {
    const config = getConfig(mockParams(), "windows");

    expect(Object.keys(config.scripts).sort()).toEqual([
      "build:windows",
      "start:windows",
      "windows",
    ]);
    expect(Object.keys(config.dependencies)).toEqual(["react-native-windows"]);
    expect(Object.keys(config.files).sort()).toEqual([]);
    expect(config.oldFiles.sort()).toEqual([
      "Test.sln",
      "Test.vcxproj",
      "Test/Test.vcxproj",
    ]);
  });
});
