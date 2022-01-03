// @ts-check
"use strict";

jest.mock("fs");

describe("generateSolution", () => {
  const path = require("path");
  const { mockFiles } = require("../mockFiles");
  const { generateSolution } = require("../../windows/test-app");

  const cwd = process.cwd();

  const options = {
    autolink: false,
    useHermes: false,
    useNuGet: false,
  };

  beforeEach(() => {
    process.chdir(path.dirname(cwd));
  });

  afterEach(() => {
    mockFiles();
    process.chdir(cwd);
  });

  test("throws if destination path is missing/invalid", () => {
    expect(() => generateSolution("", options)).toThrow(
      "Missing or invalid destination path"
    );
  });

  test("exits if 'node_modules' folder cannot be found", () => {
    expect(generateSolution("test", options)).toBe(
      "Could not find 'node_modules'"
    );
  });

  test("exits if 'react-native-windows' folder cannot be found", () => {
    mockFiles({ [path.resolve("", "node_modules", ".bin")]: "directory" });

    expect(generateSolution("test", options)).toBe(
      "Could not find 'react-native-windows'"
    );
  });

  test("exits if 'react-native-test-app' folder cannot be found", () => {
    mockFiles({
      [path.resolve(
        "",
        "node_modules",
        "react-native-windows",
        "package.json"
      )]: "{}",
    });

    expect(generateSolution("test", options)).toBe(
      "Could not find 'react-native-test-app'"
    );
  });
});
