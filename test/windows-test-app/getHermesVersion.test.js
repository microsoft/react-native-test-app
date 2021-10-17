//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

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
  const path = require("path");
  const { mockFiles } = require("../mockFiles");
  const { getHermesVersion } = require("../../windows/test-app");

  afterEach(() => mockFiles());

  test("returns the required Hermes version", () => {
    ["0.7.2", "0.8.0-ms.0", "0.9.0-ms.1"].forEach((version) => {
      mockFiles({
        [path.join("react-native-windows", "PropertySheets", "JSEngine.props")]:
          jsEngineProps(version),
      });
      expect(getHermesVersion("react-native-windows")).toBe(version);
    });
  });
});
