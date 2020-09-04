jest.mock("fs");

describe("generateSolution", () => {
  const path = require("path");
  const { generateSolution } = require("../windows/test-app");

  const cwd = process.cwd();

  beforeEach(() => {
    process.chdir(path.dirname(cwd));
  });

  afterEach(() => {
    require("fs").__setMockFiles({});
    process.chdir(cwd);
  });

  test("throws if destination path is missing/invalid", () => {
    expect(() => generateSolution("")).toThrow(
      "Missing or invalid destination path"
    );
  });

  test("exits if 'node_modules' folder cannot be found", () => {
    expect(generateSolution("test")).toBe("Could not find 'node_modules'");
  });

  test("exits if 'react-native-windows' folder cannot be found", () => {
    require("fs").__setMockFiles({
      [path.resolve("", "node_modules")]: "directory",
    });

    expect(generateSolution("test")).toBe(
      "Could not find 'react-native-windows'"
    );
  });

  test("exits if 'react-native-test-app' folder cannot be found", () => {
    require("fs").__setMockFiles({
      [path.resolve("", "node_modules")]: "directory",
      [path.resolve("", "node_modules", "react-native-windows")]: "directory",
    });

    expect(generateSolution("test")).toBe(
      "Could not find 'react-native-test-app'"
    );
  });
});
