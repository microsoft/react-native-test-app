// @ts-check
import { equal } from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { removeAllFiles as removeAllFilesActual } from "../../scripts/configure.js";
import fsp from "../fs-promises.mock.js";
import fs from "../fs.mock.js";

describe("removeAllFiles()", () => {
  /** @type {typeof removeAllFilesActual} */
  const removeAllFiles = (files, destination) =>
    removeAllFilesActual(files, destination, fsp);

  beforeEach(() => {
    fs.__setMockFiles({
      "babel.config.js": "module.exports = {};",
      "metro.config.js": "module.exports = {};",
    });
  });

  after(() => fs.__setMockFiles());

  it("removes all specified files", async () => {
    equal(fs.existsSync("babel.config.js"), true);
    equal(fs.existsSync("metro.config.js"), true);

    await removeAllFiles(["babel.config.js", "metro.config.js"], ".");

    equal(fs.existsSync("babel.config.js"), false);
    equal(fs.existsSync("metro.config.js"), false);
  });

  it("ignores non-existent files", async () => {
    equal(fs.existsSync("babel.config.js"), true);
    equal(fs.existsSync("metro.config.js"), true);

    await removeAllFiles(["babel.config.js", "react-native.config.js"], ".");

    equal(fs.existsSync("babel.config.js"), false);
    equal(fs.existsSync("metro.config.js"), true);
  });
});
