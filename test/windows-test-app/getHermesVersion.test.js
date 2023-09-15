// @ts-check
"use strict";

/**
 * Returns a property sheet with specified Hermes version.
 * @param {string} version
 * @returns {string}
 */
function jsEngineProps(version) {
  return `
<?xml version="1.0" encoding="utf-8"?>
<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <HermesVersion Condition="'$(HermesVersion)' == ''">${version}</HermesVersion>
  </PropertyGroup>
</Project>
`;
}

describe("getHermesVersion", () => {
  const path = require("node:path");
  const fs = require("../fs.mock");
  const {
    getHermesVersion: getHermesVersionActual,
  } = require("../../windows/test-app");

  /** @type {typeof getHermesVersionActual} */
  const getHermesVersion = (p) => getHermesVersionActual(p, fs);

  afterEach(() => fs.__setMockFiles());

  test("returns the required Hermes version", () => {
    ["0.7.2", "0.8.0-ms.0", "0.9.0-ms.1"].forEach((version) => {
      fs.__setMockFiles({
        [path.join("react-native-windows", "PropertySheets", "JSEngine.props")]:
          jsEngineProps(version),
      });
      expect(getHermesVersion("react-native-windows")).toBe(version);
    });
  });
});
