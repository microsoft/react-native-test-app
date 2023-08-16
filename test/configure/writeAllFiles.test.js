// @ts-check
"use strict";

jest.mock("fs");
jest.mock("fs/promises");

const fs = require("fs");
const path = require("path");

describe("writeAllFiles()", () => {
  const { mockFiles } = require("../mockFiles");
  const { writeAllFiles } = require("../../scripts/configure");

  afterEach(() => {
    mockFiles();
  });

  test("writes all files to disk", async () => {
    mockFiles({ "file-on-disk": "0" });
    await writeAllFiles(
      {
        file0: { source: "file-on-disk" },
        file1: "1",
        file2: "2",
      },
      "test"
    );

    expect(fs.readFileSync(path.join("test", "file0"), "utf-8")).toBe("0");
    expect(fs.readFileSync(path.join("test", "file1"), "utf-8")).toBe("1");
    expect(fs.readFileSync(path.join("test", "file2"), "utf-8")).toBe("2");
  });

  test("ignores files with no content", async () => {
    await writeAllFiles(
      {
        file1: "1",
        file2: "2",
        file3: "",
      },
      "."
    );

    expect(fs.readFileSync("file1", "utf-8")).toBe("1");
    expect(fs.readFileSync("file2", "utf-8")).toBe("2");
    expect(() => fs.readFileSync("file3")).toThrow("ENOENT");
  });

  test("rethrows write exceptions", async () => {
    await expect(
      writeAllFiles(
        {
          file0: {
            // This entry will throw an exception
            source: "Bad Arnold movies.txt",
          },
          file1: "1",
          file2: "2",
        },
        "."
      )
    ).rejects.toThrow();

    await expect(
      writeAllFiles(
        {
          file1: "1",
          file2: "2",
          "": "3", // This entry will throw an exception
        },
        "."
      )
    ).rejects.toThrow();

    expect(fs.readFileSync("file1", "utf-8")).toBe("1");
    expect(fs.readFileSync("file2", "utf-8")).toBe("2");
    expect(() => fs.readFileSync("")).toThrow("EISDIR");
  });
});
