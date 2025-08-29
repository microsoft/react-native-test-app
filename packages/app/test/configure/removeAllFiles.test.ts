import { ok } from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { removeAllFiles as removeAllFilesActual } from "../../scripts/configure.mjs";
import { fs, setMockFiles } from "../fs.mock.ts";

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
    ok(fs.existsSync("babel.config.js"));
    ok(fs.existsSync("metro.config.js"));

    await removeAllFiles(["babel.config.js", "metro.config.js"], ".");

    ok(!fs.existsSync("babel.config.js"));
    ok(!fs.existsSync("metro.config.js"));
  });

  it("ignores non-existent files", async () => {
    ok(fs.existsSync("babel.config.js"));
    ok(fs.existsSync("metro.config.js"));

    await removeAllFiles(["babel.config.js", "react-native.config.js"], ".");

    ok(!fs.existsSync("babel.config.js"));
    ok(fs.existsSync("metro.config.js"));
  });
});
