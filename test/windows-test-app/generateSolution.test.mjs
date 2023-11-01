// @ts-check
import { equal } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { generateSolution as generateSolutionActual } from "../../windows/test-app.js";
import { fs, setMockFiles } from "../fs.mock.mjs";

describe("generateSolution()", () => {
  /** @type {typeof generateSolutionActual} */
  const generateSolution = (d, cfg) => generateSolutionActual(d, cfg, fs);

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

  it("exits if destination path is missing/invalid", () => {
    equal(generateSolution("", options), "Missing or invalid destination path");
  });

  it("exits if 'package.json' folder cannot be found", () => {
    equal(generateSolution("test", options), "Could not find 'package.json'");
  });

  it("exits if 'react-native-windows' folder cannot be found", () => {
    setMockFiles({
      [path.resolve("", "package.json")]: testManifest,
      [path.resolve("", "node_modules", ".bin")]: "directory",
    });

    equal(
      generateSolution("test", options),
      "Could not find 'react-native-windows'"
    );
  });

  it("exits if 'react-native-test-app' folder cannot be found", () => {
    setMockFiles({
      [path.resolve("", "package.json")]: testManifest,
      [path.resolve(
        "",
        "node_modules",
        "react-native-windows",
        "package.json"
      )]: "{}",
    });

    equal(
      generateSolution("test", options),
      "Could not find 'react-native-test-app'"
    );
  });
});
