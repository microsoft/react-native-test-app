//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("getPackageVersion", () => {
  const path = require("path");
  const { getPackageVersion } = require("../../windows/test-app");

  const nodeModulesPath = path.resolve(
    __dirname,
    "..",
    "__fixtures__",
    "test_app",
    "node_modules"
  );

  test("returns version number for specified package", () => {
    const rnPath = path.join(nodeModulesPath, "react-native");
    expect(getPackageVersion(rnPath)).toBe("1000.0.0");

    const rnCliPath = path.join(
      nodeModulesPath,
      "@react-native-community",
      "cli-platform-ios"
    );
    expect(getPackageVersion(rnCliPath)).toBe("4.10.1");
  });
});
