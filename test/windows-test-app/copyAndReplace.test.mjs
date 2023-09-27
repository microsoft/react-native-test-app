// @ts-check
import { equal, fail, match, rejects } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { promisify } from "node:util";
import { copyAndReplace as copyAndReplaceActual } from "../../windows/test-app.js";
import fs from "../fs.mock.js";
import spy from "../spy.mjs";

describe("copyAndReplace()", () => {
  /** @type {typeof copyAndReplaceActual} */
  const copyAndReplace = (src, dst, r, cb) =>
    copyAndReplaceActual(src, dst, r, cb, fs);

  const copyAndReplaceAsync = promisify(copyAndReplace);

  afterEach(() => fs.__setMockFiles());

  it("copies files if no modifications are needed", async (t) => {
    t.mock.method(fs, "copyFile");
    fs.__setMockFiles({
      "ReactTestApp.png": "binary",
      "test/.placeholder": "",
    });

    await copyAndReplaceAsync(
      "ReactTestApp.png",
      "test/ReactTestApp.png",
      undefined
    );

    equal(spy(fs.copyFile).calls.length, 1);
    equal(
      fs.readFileSync("test/ReactTestApp.png", { encoding: "utf-8" }),
      "binary"
    );
  });

  it("replaces file content", async (t) => {
    t.mock.method(fs, "copyFile");
    fs.__setMockFiles({
      "ReactTestApp.png": "binary",
      "test/.placeholder": "",
    });

    await copyAndReplaceAsync("ReactTestApp.png", "test/ReactTestApp.png", {
      binary: "text",
    });

    equal(spy(fs.copyFile).calls.length, 0);
    equal(
      fs.readFileSync("test/ReactTestApp.png", { encoding: "utf-8" }),
      "text"
    );
  });

  it("throws on error", async () => {
    await rejects(copyAndReplaceAsync("ReactTestApp.png", "", {}), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      match(err.message, /ENOENT/);
      return true;
    });
    await rejects(copyAndReplaceAsync("ReactTestApp.sln", "", {}), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      match(err.message, /ENOENT/);
      return true;
    });
  });
});
