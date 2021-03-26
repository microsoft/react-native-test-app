//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("projectRelativePath()", () => {
  const { mockParams } = require("./mockParams");
  const { projectRelativePath } = require("../../scripts/configure");

  test("returns path relative to package with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
    });
    expect(projectRelativePath(params)).toEqual(
      "../../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to package with platform specific folders (flatten=true)", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      flatten: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to package with flattened structure", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-ios",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      platforms: ["ios"],
      flatten: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to new app with platform specific folders (flatten=true)", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      flatten: true,
      init: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to new app with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      init: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to new app with flattened structure", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-ios",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      platforms: ["ios"],
      flatten: true,
      init: true,
    });
    expect(projectRelativePath(params)).toEqual(
      "node_modules/react-native-test-app"
    );
  });
});
