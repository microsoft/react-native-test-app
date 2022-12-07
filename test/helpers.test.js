// @ts-check
"use strict";

describe("findNearest", () => {
  const path = require("path");
  const { findNearest } = require("../scripts/helpers");

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
