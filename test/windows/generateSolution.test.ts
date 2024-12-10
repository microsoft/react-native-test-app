import { equal } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generateSolution as generateSolutionActual } from "../../windows/test-app.mjs";
import { fs, setMockFiles } from "../fs.mock.ts";

describe("generateSolution()", () => {
  const generateSolution: typeof generateSolutionActual = (d, cfg) =>
    generateSolutionActual(d, cfg, fs);

  const cwd = process.cwd();

  const options = {
    autolink: false,
    useHermes: false,
    useNuGet: false,
  };

  const testManifest = `{ name: "react-native-test-app", version: "0.0.1-dev" }`;

  beforeEach(() => {
    process.chdir(path.dirname(cwd));
  });

  afterEach(() => {
    setMockFiles();
    process.chdir(cwd);
  });

  it("exits if destination path is missing/invalid", async () => {
    equal(
      await generateSolution("", options),
      "Missing or invalid destination path"
    );
  });

  it("exits if 'package.json' folder cannot be found", async () => {
    equal(
      await generateSolution("test", options),
      "Could not find 'package.json'"
    );
  });

  it("exits if 'react-native-windows' folder cannot be found", async () => {
    setMockFiles({
      [path.resolve("", "package.json")]: testManifest,
      [path.resolve("", "node_modules", ".bin")]: "directory",
    });

    equal(
      await generateSolution("test", options),
      "Could not find 'react-native-windows'"
    );
  });
});
