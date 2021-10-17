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
    mockFiles({
      "babel.config.js": "module.exports = {};",
      "metro.config.js": "module.exports = {};",
    });
  });

  afterAll(() => {
    mockFiles();
  });

  test("removes all specified files", async () => {
    expect(fs.existsSync("babel.config.js")).toBe(true);
    expect(fs.existsSync("metro.config.js")).toBe(true);

    await removeAllFiles(["babel.config.js", "metro.config.js"], ".");

    expect(fs.existsSync("babel.config.js")).toBe(false);
    expect(fs.existsSync("metro.config.js")).toBe(false);
  });

  test("ignores non-existent files", async () => {
    expect(fs.existsSync("babel.config.js")).toBe(true);
    expect(fs.existsSync("metro.config.js")).toBe(true);

    await removeAllFiles(["babel.config.js", "react-native.config.js"], ".");

    expect(fs.existsSync("babel.config.js")).toBe(false);
    expect(fs.existsSync("metro.config.js")).toBe(true);
  });
});
