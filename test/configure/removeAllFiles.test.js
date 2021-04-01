//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

const fs = require("fs");

describe("removeAllFiles()", () => {
  const { mockFiles } = require("../mockFiles");
  const { removeAllFiles } = require("../../scripts/configure");

  beforeEach(() => {
    mockFiles(
      ["babel.config.js", "module.exports = {};"],
      ["metro.config.js", "module.exports = {};"]
    );
  });

  test("removes all specified files", () => {
    removeAllFiles(["babel.config.js", "metro.config.js"], ".");
    expect(fs.readFileSync("babel.config.js")).toBeUndefined();
    expect(fs.readFileSync("metro.config.js")).toBeUndefined();
  });

  test("ignores non-existent files", () => {
    removeAllFiles(["babel.config.js", "react-native.config.js"], ".");
    expect(fs.readFileSync("babel.config.js")).toBeUndefined();
    expect(fs.readFileSync("metro.config.js")).toBeDefined();
  });
});
