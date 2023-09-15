// @ts-check
"use strict";

describe("writeAllFiles()", () => {
  const path = require("node:path");
  const fs = require("../fs.mock");
  const fsp = require("../fs-promises.mock");
  const {
    writeAllFiles: writeAllFilesActual,
  } = require("../../scripts/configure");

  /** @type {typeof writeAllFilesActual} */
  const writeAllFiles = (files, dest) => writeAllFilesActual(files, dest, fsp);

  afterEach(() => {
    fs.__setMockFiles();
  });

  test("writes all files to disk", async () => {
    fs.__setMockFiles({ "file-on-disk": "0" });
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
