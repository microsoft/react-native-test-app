// @ts-check
"use strict";

const {
  findNearest,
  getPackageVersion,
  requireTransitive,
} = require("../scripts/helpers");

describe("findNearest", () => {
  const path = require("path");

  test("returns null for non-existent files", () => {
    expect(findNearest("thisFileShouldNotExist")).toBeNull();
  });

  test("returns target in current path", () => {
    const packageJson = "package.json";
    expect(findNearest(packageJson)).toBe(packageJson);
  });

  test("returns target in ancestor path", () => {
    const fixturePath = path.join("test", "__fixtures__", "with_resources");
    const projectPath = path.join(fixturePath, "windows");
    expect(findNearest("app.json", projectPath)).toBe(
      path.join(fixturePath, "app.json")
    );
  });

  test("finds arbitrary paths", () => {
    const fixturePath = path.join("test", "__fixtures__", "test_app");
    const projectPath = path.join(fixturePath, "windows");
    expect(
      findNearest(path.join("node_modules", "react-native"), projectPath)
    ).toBe(path.join(fixturePath, "node_modules", "react-native"));
  });
});

describe("getPackageVersion", () => {
  const path = require("path");

  const nodeModulesPath = path.resolve(
    __dirname,
    "__fixtures__",
    "test_app",
    "node_modules"
  );

  test("returns version number for specified package", () => {
    const rnPath = path.join(nodeModulesPath, "react-native");
    expect(getPackageVersion("react-native", rnPath)).toBe("1000.0.0");
    expect(
      getPackageVersion("@react-native-community/cli-platform-ios", rnPath)
    ).toBe("4.10.1");
  });
});

describe("requireTransitive", () => {
  const path = require("path");

  test("imports transitive dependencies", () => {
    const mustache = requireTransitive([
      "react-native-windows",
      "@react-native-windows/cli",
      "mustache",
    ]);
    expect(mustache).toBeDefined();
    expect(typeof mustache.parse).toBe("function");
  });

  test("imports transitive dependencies given a start path", () => {
    const mustache = requireTransitive(
      ["@react-native-windows/cli", "mustache"],
      path.dirname(require.resolve("react-native-windows/package.json"))
    );
    expect(mustache).toBeDefined();
    expect(typeof mustache.parse).toBe("function");
  });
});
