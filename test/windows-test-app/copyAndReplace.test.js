// @ts-check
"use strict";

describe("copyAndReplace", () => {
  const { promisify } = require("util");
  const fs = require("../fs.mock");
  const {
    copyAndReplace: copyAndReplaceActual,
  } = require("../../windows/test-app");

  /** @type {typeof copyAndReplaceActual} */
  const copyAndReplace = (src, dst, r, cb) =>
    copyAndReplaceActual(src, dst, r, cb, fs);

  const copyFileSpy = jest.spyOn(fs, "copyFile");

  const copyAndReplaceAsync = promisify(copyAndReplace);

  afterEach(() => {
    fs.__setMockFiles();
    copyFileSpy.mockReset();
  });

  test("copies files if no modifications are needed", async () => {
    fs.__setMockFiles({
      "ReactTestApp.png": "binary",
      "test/.placeholder": "",
    });

    await copyAndReplaceAsync(
      "ReactTestApp.png",
      "test/ReactTestApp.png",
      undefined
    );

    expect(copyFileSpy).toHaveBeenCalledTimes(1);
    expect(
      fs.readFileSync("test/ReactTestApp.png", {
        encoding: "utf8",
      })
    ).toBe("binary");
  });

  test("replaces file content", async () => {
    fs.__setMockFiles({
      "ReactTestApp.png": "binary",
      "test/.placeholder": "",
    });

    await copyAndReplaceAsync("ReactTestApp.png", "test/ReactTestApp.png", {
      binary: "text",
    });

    expect(copyFileSpy).not.toHaveBeenCalled();
    expect(
      fs.readFileSync("test/ReactTestApp.png", {
        encoding: "utf8",
      })
    ).toBe("text");
  });

  test("throws on error", async () => {
    await expect(
      copyAndReplaceAsync("ReactTestApp.png", "", {})
    ).rejects.toEqual(
      expect.objectContaining({ message: expect.stringContaining("ENOENT") })
    );
    await expect(
      copyAndReplaceAsync("ReactTestApp.sln", "", {})
    ).rejects.toEqual(
      expect.objectContaining({ message: expect.stringContaining("ENOENT") })
    );
  });
});
