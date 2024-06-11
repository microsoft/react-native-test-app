// @ts-check
import { equal, fail, match, rejects } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { readTextFile as readTextFileActual } from "../../scripts/helpers.js";
import { copyAndReplace as copyAndReplaceActual } from "../../windows/test-app.mjs";
import { fs, setMockFiles } from "../fs.mock.mjs";
import { spy } from "../spy.mjs";

describe("copyAndReplace()", () => {
  /** @type {typeof copyAndReplaceActual} */
  const copyAndReplace = (src, dst, r) =>
    copyAndReplaceActual(src, dst, r, fs.promises);

  /** @type {typeof readTextFileActual} */
  const readTextFile = (p) => readTextFileActual(p, fs);

  afterEach(() => setMockFiles());

  // TODO: Skip because `memfs` hasn't implemented `fs.cp` or `fs.promises.cp`
  it.skip("copies files if no modifications are needed", async (t) => {
    t.mock.method(fs.promises, "cp");
    setMockFiles({
      "ReactTestApp.png": "binary",
      "test/.placeholder": "",
    });

    await copyAndReplace(
      "ReactTestApp.png",
      "test/ReactTestApp.png",
      undefined
    );

    equal(spy(fs.promises.cp).calls.length, 1);
    equal(readTextFile("test/ReactTestApp.png"), "binary");
  });

  it("replaces file content", async (t) => {
    t.mock.method(fs.promises, "cp");
    setMockFiles({
      "ReactTestApp.png": "binary",
      "test/.placeholder": "",
    });

    await copyAndReplace("ReactTestApp.png", "test/ReactTestApp.png", {
      binary: "text",
    });

    equal(spy(fs.promises.cp).calls.length, 0);
    equal(readTextFile("test/ReactTestApp.png"), "text");
  });

  it("throws on error", async () => {
    await rejects(copyAndReplace("ReactTestApp.png", "", {}), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      match(err.message, /ENOENT/);
      return true;
    });
    await rejects(copyAndReplace("ReactTestApp.sln", "", {}), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      match(err.message, /ENOENT/);
      return true;
    });
  });
});
