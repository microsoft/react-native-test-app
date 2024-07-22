import { equal } from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { removeAllFiles as removeAllFilesActual } from "../../scripts/configure.mjs";
import { fs, setMockFiles } from "../fs.mock.js";

describe("removeAllFiles()", () => {
  const removeAllFiles: typeof removeAllFilesActual = (files, destination) =>
    removeAllFilesActual(files, destination, fs.promises);

  beforeEach(() => {
    setMockFiles({
      "babel.config.js": "module.exports = {};",
      "metro.config.js": "module.exports = {};",
    });
  });

  after(() => setMockFiles());

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
