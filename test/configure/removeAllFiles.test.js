// @ts-check
"use strict";

describe("removeAllFiles()", () => {
  const fs = require("../fs.mock");
  const fsp = require("../fs-promises.mock");
  const {
    removeAllFiles: removeAllFilesActual,
  } = require("../../scripts/configure");

  /** @type {typeof removeAllFilesActual} */
  const removeAllFiles = (files, destination) =>
    removeAllFilesActual(files, destination, fsp);

  beforeEach(() => {
    fs.__setMockFiles({
      "babel.config.js": "module.exports = {};",
      "metro.config.js": "module.exports = {};",
    });
  });

  afterAll(() => {
    fs.__setMockFiles();
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
