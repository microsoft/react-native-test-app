// @ts-check
import { equal } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { getHermesVersion as getHermesVersionActual } from "../../windows/project.mjs";
import { fs, setMockFiles } from "../fs.mock.mjs";

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

describe("getHermesVersion()", () => {
  /** @type {typeof getHermesVersionActual} */
  const getHermesVersion = (p) => getHermesVersionActual(p, fs);

  afterEach(() => setMockFiles());

  for (const version of ["0.7.2", "0.8.0-ms.0", "0.9.0-ms.1"]) {
    it(`returns Hermes version ${version}`, () => {
      setMockFiles({
        [path.join("react-native-windows", "PropertySheets", "JSEngine.props")]:
          jsEngineProps(version),
      });
      equal(getHermesVersion("react-native-windows"), version);
    });
  }
});
