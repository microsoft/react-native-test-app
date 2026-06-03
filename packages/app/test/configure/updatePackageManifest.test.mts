import { deepEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { afterEach, describe, it } from "node:test";
import { updatePackageManifest as updatePackageManifestActual } from "../../scripts/configure.mjs";
import { fs, setMockFiles } from "../fs.mock.mts";

function getCatalog(): Record<string, string> {
  const { stdout } = spawnSync("yarn", ["config", "get", "catalog", "--json"], {
    shell: process.platform === "win32",
  });
  return JSON.parse(stdout.toString().trim());
}

describe("updatePackageManifest()", () => {
  const updatePackageManifest: typeof updatePackageManifestActual = (p, cfg) =>
    updatePackageManifestActual(p, cfg, fs);

  const catalog = getCatalog();
  const devDependencies = {
    "@rnx-kit/metro-config": catalog["@rnx-kit/metro-config"],
    "react-native-test-app": "^0.0.1-dev",
  };

  afterEach(() => setMockFiles());

  it("adds `scripts` field if missing", () => {
    setMockFiles({ "package.json": `{ "key": "value" }` });

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
      devDependencies,
    });
  });

  it("adds to existing `scripts` field", () => {
    setMockFiles({
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
      devDependencies,
    });
  });
});
