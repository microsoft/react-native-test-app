//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

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
    mockFiles([path.resolve("", "node_modules"), "directory"]);

    expect(generateSolution("test", options)).toBe(
      "Could not find 'react-native-windows'"
    );
  });

  test("exits if 'react-native-test-app' folder cannot be found", () => {
    mockFiles(
      [path.resolve("", "node_modules"), "directory"],
      [path.resolve("", "node_modules", "react-native-windows"), "directory"]
    );

    expect(generateSolution("test", options)).toBe(
      "Could not find 'react-native-test-app'"
    );
  });
});
