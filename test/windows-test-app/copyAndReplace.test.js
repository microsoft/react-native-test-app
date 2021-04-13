//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

describe("copyAndReplace", () => {
  const { mockFiles } = require("../mockFiles");
  const { copyAndReplace } = require("../../windows/test-app");

  afterEach(() => mockFiles());

  test("replaces text files only", () => {
    mockFiles(
      ["ReactTestApp_TemporaryKey.pfx", "binary"],
      ["ReactTestApp.png", "binary"],
      ["ReactTestApp.sln", "binary"]
    );

    const fs = require("fs");

    const replacements = { binary: "text" };

    copyAndReplace(
      "ReactTestApp_TemporaryKey.pfx",
      "test/ReactTestApp_TemporaryKey.pfx",
      replacements
    );
    expect(
      fs.readFileSync("test/ReactTestApp_TemporaryKey.pfx", {
        encoding: "utf8",
      })
    ).toBe("binary");

    copyAndReplace("ReactTestApp.png", "test/ReactTestApp.png", replacements);
    expect(
      fs.readFileSync("test/ReactTestApp.png", {
        encoding: "utf8",
      })
    ).toBe("binary");

    copyAndReplace("ReactTestApp.sln", "test/ReactTestApp.sln", replacements);
    expect(
      fs.readFileSync("test/ReactTestApp.sln", {
        encoding: "utf8",
      })
    ).toBe("text");
  });

  test("throws on error", () => {
    expect(() => copyAndReplace("ReactTestApp.png", "")).toThrow(
      "copyFile() error"
    );
    expect(() => copyAndReplace("ReactTestApp.sln", "")).toThrow(
      "writeFile() error"
    );
  });
});
