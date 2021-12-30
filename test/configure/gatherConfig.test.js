//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("gatherConfig()", () => {
  const { mockParams } = require("./mockParams");
  const { gatherConfig } = require("../../scripts/configure");

  /**
   * Normalizes file paths to match snapshot.
   *
   * Note that only paths that are used to read/write files are normalized.
   * File content should not be normalized because they should only contain
   * forward-slashes.
   *
   * @param {import("../../scripts/configure").Configuration} config
   * @returns {import("../../scripts/configure").Configuration}
   */
  function normalizePaths({ files, oldFiles, ...config }) {
    /** @type {(p: string) => string} */
    const normalize = (p) => p.replace(/\\/g, "/");
    return {
      ...config,
      files: Object.fromEntries(
        Object.entries(files).map(([key, value]) => [
          normalize(key),
          typeof value === "string"
            ? value
            : { source: normalize(value.source) },
        ])
      ),
      oldFiles: oldFiles.map(normalize),
    };
  }

  /**
   * Like `gatherConfig()`, but with normalized paths.
   * @param {import("../../scripts/configure").ConfigureParams} params
   * @returns {import("../../scripts/configure").Configuration}
   */
  function gatherConfigNormalized(params) {
    return normalizePaths(gatherConfig(params));
  }

  test("returns configuration for all platforms", () => {
    expect(gatherConfigNormalized(mockParams())).toMatchSnapshot();
  });

  test("returns common configuration", () => {
    const params = mockParams({ platforms: ["common"] });
    expect(gatherConfigNormalized(params)).toMatchSnapshot();
  });

  test("returns configuration for a single platform", () => {
    const params = mockParams({ platforms: ["ios"] });
    expect(gatherConfigNormalized(params)).toMatchSnapshot();
  });

  test("returns configuration for arbitrary platforms", () => {
    const params = mockParams({ platforms: ["android", "ios"] });
    expect(gatherConfigNormalized(params)).toMatchSnapshot();
  });

  test("flattens configuration for a single platform only", () => {
    const iosOnly = mockParams({ platforms: ["ios"], flatten: true });
    expect(gatherConfigNormalized(iosOnly)).toMatchSnapshot();

    const mobile = mockParams({ platforms: ["android", "ios"], flatten: true });
    expect(gatherConfigNormalized(mobile)).toMatchSnapshot();
  });
});
