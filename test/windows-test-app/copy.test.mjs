// @ts-check
import { equal, match } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { copy as copyActual } from "../../windows/test-app.mjs";
import { fs, setMockFiles, toJSON } from "../fs.mock.mjs";

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

describe("copy()", () => {
  /** @type {typeof copyActual} */
  const copy = (src, dest) => copyActual(src, dest, fs);

  afterEach(() => setMockFiles());

  it("recursively copies all files under directory", async () => {
    const pngMagic = "‰PNG␍␊␚␊";
    setMockFiles({
      "assets/1.png": pngMagic,
      "assets/2.png": pngMagic,
      "assets/3.png": pngMagic,
      "assets/more/1.png": pngMagic,
      "assets/more/2.png": pngMagic,
      "assets/more/3.png": pngMagic,
    });

    // Wait until all files have been copied
    const writeDone = waitUntil(() => {
      const files = Object.keys(toJSON());
      return files.length === 12;
    });

    copy("assets", "assets copy");
    await writeDone;

    const expected = [
      /\/assets\/1\.png$/,
      /\/assets\/2\.png$/,
      /\/assets\/3\.png$/,
      /\/assets\/more\/1\.png$/,
      /\/assets\/more\/2\.png$/,
      /\/assets\/more\/3\.png$/,
      /\/assets copy\/1\.png$/,
      /\/assets copy\/2\.png$/,
      /\/assets copy\/3\.png$/,
      /\/assets copy\/more\/1\.png$/,
      /\/assets copy\/more\/2\.png$/,
      /\/assets copy\/more\/3\.png$/,
    ];
    const files = Object.keys(toJSON());

    equal(files.length, expected.length);
    for (let i = 0; i < expected.length; ++i) {
      match(files[i], expected[i]);
    }
  });
});
