// @ts-check
import { deepEqual } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { updatePackageManifest as updatePackageManifestActual } from "../../scripts/configure.js";
import fs from "../fs.mock.js";

describe("updatePackageManifest()", () => {
  /** @type {typeof updatePackageManifestActual} */
  const updatePackageManifest = (p, cfg) =>
    updatePackageManifestActual(p, cfg, fs);

  afterEach(() => fs.__setMockFiles());

  it("adds `scripts` field if missing", () => {
    fs.__setMockFiles({ "package.json": `{ "key": "value" }` });

    const config = {
      scripts: {
        test: "jest",
      },
      dependencies: {},
      files: {},
      oldFiles: [],
    };

    deepEqual(updatePackageManifest("package.json", config), {
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

  it("adds to existing `scripts` field", () => {
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

    deepEqual(updatePackageManifest("package.json", config), {
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
