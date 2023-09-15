// @ts-check
"use strict";

describe("updatePackageManifest()", () => {
  const fs = require("../fs.mock");
  const {
    updatePackageManifest: updatePackageManifestActual,
  } = require("../../scripts/configure");

  /** @type {typeof updatePackageManifestActual} */
  const updatePackageManifest = (p, cfg) =>
    updatePackageManifestActual(p, cfg, fs);

  afterEach(() => fs.__setMockFiles());

  test("adds `scripts` field if missing", () => {
    fs.__setMockFiles({ "package.json": `{ "key": "value" }` });

    const config = {
      scripts: {
        test: "jest",
      },
      dependencies: {},
      files: {},
      oldFiles: [],
    };

    expect(updatePackageManifest("package.json", config)).toEqual({
      key: "value",
      scripts: {
        test: "jest",
      },
      dependencies: {},
      devDependencies: {
        mkdirp: "^1.0.0",
        "react-native-test-app": "^0.0.1-dev",
      },
    });
  });

  test("adds to existing `scripts` field", () => {
    fs.__setMockFiles({
      "package.json": JSON.stringify({
        key: "value",
        scripts: {
          test: "jest",
        },
      }),
    });

    const config = {
      scripts: {
        run: "run",
      },
      dependencies: {},
      files: {},
      oldFiles: [],
    };

    expect(updatePackageManifest("package.json", config)).toEqual({
      key: "value",
      scripts: {
        run: "run",
        test: "jest",
      },
      dependencies: {},
      devDependencies: {
        mkdirp: "^1.0.0",
        "react-native-test-app": "^0.0.1-dev",
      },
    });
  });
});
