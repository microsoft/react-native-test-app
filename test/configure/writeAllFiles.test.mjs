// @ts-check
import { equal, rejects, throws } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { writeAllFiles as writeAllFilesActual } from "../../scripts/configure.js";
import { readTextFile as readTextFileActual } from "../../scripts/helpers.js";
import { fs, setMockFiles } from "../fs.mock.mjs";

describe("writeAllFiles()", () => {
  /** @type {typeof readTextFileActual} */
  const readTextFile = (p) => readTextFileActual(p, fs);

  /** @type {typeof writeAllFilesActual} */
  const writeAllFiles = (files, dest) =>
    writeAllFilesActual(files, dest, fs.promises);

  afterEach(() => setMockFiles());

  it("writes all files to disk", async () => {
    setMockFiles({ "file-on-disk": "0" });
    await writeAllFiles(
      {
        file0: { source: "file-on-disk" },
        file1: "1",
        file2: "2",
      },
      "test"
    );

    equal(readTextFile(path.join("test", "file0")), "0");
    equal(readTextFile(path.join("test", "file1")), "1");
    equal(readTextFile(path.join("test", "file2")), "2");
  });

  it("ignores files with no content", async () => {
    await writeAllFiles(
      {
        file1: "1",
        file2: "2",
        file3: "",
      },
      "."
    );

    equal(readTextFile("file1"), "1");
    equal(readTextFile("file2"), "2");
    throws(() => readTextFile("file3"), "ENOENT");
  });

  it("rethrows write exceptions", async () => {
    await rejects(
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
    );

    await rejects(
      writeAllFiles(
        {
          file1: "1",
          file2: "2",
          "": "3", // This entry will throw an exception
        },
        "."
      )
    );

    equal(readTextFile("file1"), "1");
    equal(readTextFile("file2"), "2");
    throws(() => readTextFile(""), "EISDIR");
  });
});
