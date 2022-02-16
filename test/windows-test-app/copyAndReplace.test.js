// @ts-check
"use strict";

jest.mock("fs");

describe("copyAndReplace", () => {
  const fs = require("fs");
  const { promisify } = require("util");
  const { mockFiles } = require("../mockFiles");
  const { copyAndReplace } = require("../../windows/test-app");

  const copyFileSpy = jest.spyOn(fs, "copyFile");

  const copyAndReplaceAsync = promisify(copyAndReplace);

  afterEach(() => {
    mockFiles();
    copyFileSpy.mockReset();
  });

  test("copies files if no modifications are needed", async () => {
    mockFiles({
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
    mockFiles({
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
