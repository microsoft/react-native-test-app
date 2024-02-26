// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { projectRelativePath } from "../../scripts/configure.mjs";
import { mockParams } from "./mockParams.mjs";

describe("projectRelativePath()", () => {
  it("returns path relative to package with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
    });
    equal(
      projectRelativePath(params),
      "../../node_modules/react-native-test-app"
    );
  });

  it("returns path relative to package with platform specific folders (flatten=true)", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      flatten: true,
    });
    equal(
      projectRelativePath(params),
      "../../node_modules/react-native-test-app"
    );
  });

  it("returns path relative to package with flattened structure", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-ios",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      platforms: ["ios"],
      flatten: true,
    });
    equal(projectRelativePath(params), "../node_modules/react-native-test-app");
  });

  it("returns path relative to new app with platform specific folders (flatten=true)", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      flatten: true,
      init: true,
    });
    equal(projectRelativePath(params), "../node_modules/react-native-test-app");
  });

  it("returns path relative to new app with platform specific folders", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-app",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      init: true,
    });
    equal(projectRelativePath(params), "../node_modules/react-native-test-app");
  });

  it("returns path relative to new app with flattened structure", () => {
    const params = mockParams({
      packagePath: "/MyAwesomeLib/example-ios",
      testAppPath: "/MyAwesomeLib/node_modules/react-native-test-app",
      platforms: ["ios"],
      flatten: true,
      init: true,
    });
    equal(projectRelativePath(params), "node_modules/react-native-test-app");
  });
});
