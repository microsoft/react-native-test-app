// @ts-check
import { equal, fail, notEqual } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  findNearest,
  getPackageVersion,
  requireTransitive,
  toVersionNumber,
} from "../scripts/helpers.js";

describe("findNearest()", () => {
  it("returns null for non-existent files", () => {
    equal(findNearest("thisFileShouldNotExist"), null);
  });

  it("returns target in current path", () => {
    const packageJson = "package.json";
    equal(findNearest(packageJson), packageJson);
  });

  it("returns target in ancestor path", () => {
    const fixturePath = path.join("test", "__fixtures__", "with_resources");
    const projectPath = path.join(fixturePath, "windows");
    equal(
      findNearest("app.json", projectPath),
      path.join(fixturePath, "app.json")
    );
  });

  it("finds arbitrary paths", () => {
    const fixturePath = path.join("test", "__fixtures__", "test_app");
    const projectPath = path.join(fixturePath, "windows");
    equal(
      findNearest(path.join("node_modules", "react-native"), projectPath),
      path.join(fixturePath, "node_modules", "react-native")
    );
  });
});

describe("getPackageVersion()", () => {
  const nodeModulesPath = fileURLToPath(
    new URL("__fixtures__/test_app/node_modules", import.meta.url)
  );

  it("returns version number for specified package", () => {
    const rnPath = path.join(nodeModulesPath, "react-native");
    equal(getPackageVersion("react-native", rnPath), "1000.0.0");
    equal(
      getPackageVersion("@react-native-community/cli-platform-ios", rnPath),
      "4.10.1"
    );
  });
});

describe("requireTransitive()", () => {
  it("imports transitive dependencies", () => {
    const mustache = requireTransitive([
      "react-native-windows",
      "@react-native-windows/cli",
      "mustache",
    ]);
    notEqual(mustache, null);
    equal(typeof mustache.parse, "function");
  });

  it("imports transitive dependencies given a start path", () => {
    const rnwDir = findNearest("node_modules/react-native-windows");
    if (!rnwDir) {
      fail("Failed to resolve 'react-native-windows'");
    }

    const mustache = requireTransitive(
      ["@react-native-windows/cli", "mustache"],
      rnwDir
    );
    notEqual(mustache, null);
    equal(typeof mustache.parse, "function");
  });
});

describe("toVersionNumber()", () => {
  it("converts a version string to its numerical value equivalent", () => {
    equal(toVersionNumber("0.0.0-rc.1"), 0);
    equal(toVersionNumber("0.0.0"), 0);
    equal(toVersionNumber("0.0.1"), 1);
    equal(toVersionNumber("0.1.0"), 1000);
    equal(toVersionNumber("0.1.1"), 1001);
    equal(toVersionNumber("1.0.0"), 1000000);
    equal(toVersionNumber("1.0.1"), 1000001);
    equal(toVersionNumber("1.1.0"), 1001000);
    equal(toVersionNumber("1.1.1"), 1001001);
    equal(toVersionNumber("1.1"), 1001000);
    equal(toVersionNumber("1"), 1000000);
  });
});
