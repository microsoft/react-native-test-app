// @ts-check
"use strict";

jest.mock("fs");

describe("updatePackageManifest()", () => {
  const { mockFiles } = require("../mockFiles");
  const { updatePackageManifest } = require("../../scripts/configure");

  afterEach(() => mockFiles());

  test("adds `scripts` field if missing", () => {
    mockFiles({ "package.json": `{ "key": "value" }` });

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
    mockFiles({
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
