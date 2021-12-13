//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

describe("copyAndReplace", () => {
  const fs = require("fs");
  const { promisify } = require("util");
  const { mockFiles } = require("../mockFiles");
  const { copyAndReplace } = require("../../windows/test-app");

  const copyAndReplaceAsync = promisify(copyAndReplace);

  afterEach(() => mockFiles());

  test("replaces text files only", async () => {
    mockFiles({
      "ReactTestApp.png": "binary",
      "ReactTestApp.sln": "binary",
      "test/.placeholder": "",
    });

    const replacements = { binary: "text" };

    await copyAndReplaceAsync(
      "ReactTestApp.png",
      "test/ReactTestApp.png",
      replacements
    );
    expect(
      fs.readFileSync("test/ReactTestApp.png", {
        encoding: "utf8",
      })
    ).toBe("binary");

    await copyAndReplaceAsync(
      "ReactTestApp.sln",
      "test/ReactTestApp.sln",
      replacements
    );
    expect(
      fs.readFileSync("test/ReactTestApp.sln", {
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
