// @ts-check
"use strict";

jest.mock("fs");

/**
 * Waits until the specified predicate returns `true`.
 * @param {() => boolean} predicate
 */
async function waitUntil(predicate) {
  for (let i = 0; i < 3; ++i) {
    if (predicate()) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 33));
  }
}

describe("copy", () => {
  const fs = require("fs");
  const { mockFiles } = require("../mockFiles");
  const { copy } = require("../../windows/test-app");

  afterEach(() => mockFiles());

  test("recursively copies all files under directory", async () => {
    mockFiles({
      "assets/1.png": "binary",
      "assets/2.png": "binary",
      "assets/3.png": "binary",
      "assets/more/1.png": "binary",
      "assets/more/2.png": "binary",
      "assets/more/3.png": "binary",
    });

    // Wait until all files have been copied
    const writeDone = waitUntil(() => {
      // @ts-ignore
      const files = Object.keys(fs.__toJSON());
      return files.length === 12;
    });

    copy("assets", "assets copy");
    await writeDone;

    // @ts-ignore
    const files = Object.keys(fs.__toJSON());

    expect(files).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/assets\/1\.png$/),
        expect.stringMatching(/\/assets\/2\.png$/),
        expect.stringMatching(/\/assets\/3\.png$/),
        expect.stringMatching(/\/assets\/more\/1\.png$/),
        expect.stringMatching(/\/assets\/more\/2\.png$/),
        expect.stringMatching(/\/assets\/more\/3\.png$/),
        expect.stringMatching(/\/assets copy\/1\.png$/),
        expect.stringMatching(/\/assets copy\/2\.png$/),
        expect.stringMatching(/\/assets copy\/3\.png$/),
        expect.stringMatching(/\/assets copy\/more\/1\.png$/),
        expect.stringMatching(/\/assets copy\/more\/2\.png$/),
        expect.stringMatching(/\/assets copy\/more\/3\.png$/),
      ])
    );
  });
});
