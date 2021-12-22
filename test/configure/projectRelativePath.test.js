// @ts-check
"use strict";

describe("projectRelativePath()", () => {
  const { mockParams } = require("./mockParams");
  const { projectRelativePath } = require("../../scripts/configure");

  test("returns path relative to package with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
    });
    expect(projectRelativePath(params)).toBe(
      "../../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to package with platform specific folders (flatten=true)", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      flatten: true,
    });
    expect(projectRelativePath(params)).toBe(
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
    expect(projectRelativePath(params)).toBe(
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
    expect(projectRelativePath(params)).toBe(
      "../node_modules/react-native-test-app"
    );
  });

  test("returns path relative to new app with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      init: true,
    });
    expect(projectRelativePath(params)).toBe(
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
    expect(projectRelativePath(params)).toBe(
      "node_modules/react-native-test-app"
    );
  });
});
