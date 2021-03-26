//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

describe("parseResources", () => {
  const { parseResources } = require("../../windows/test-app");

  // @ts-ignore `__setMockFiles`
  afterEach(() => require("fs").__setMockFiles({}));

  test("returns empty strings for no resources", () => {
    expect(parseResources(undefined, "", "")).toEqual(["", ""]);
    expect(parseResources([], "", "")).toEqual(["", ""]);
    expect(parseResources({}, "", "")).toEqual(["", ""]);
    expect(parseResources({ windows: [] }, "", "")).toEqual(["", ""]);
  });

  test("returns references to existing assets", () => {
    // @ts-ignore `__setMockFiles`
    require("fs").__setMockFiles({
      "dist/assets": "directory",
      "dist/main.jsbundle": "text",
    });

    expect(
      parseResources(
        ["dist/assets", "dist/main.jsbundle"],
        ".",
        "node_modules/.generated/windows/ReactTestApp"
      )
    ).toEqual([
      "../../../../dist/assets\\**\\*;",
      "../../../../dist/main.jsbundle;",
    ]);
  });

  test("skips missing assets", () => {
    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    expect(
      parseResources(
        ["dist/assets", "dist/main.bundle"],
        ".",
        "node_modules/.generated/windows/ReactTestApp"
      )
    ).toEqual(["", ""]);

    expect(warnSpy).toHaveBeenCalledWith(
      "warning: resource with path 'dist/assets' was not found"
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "warning: resource with path 'dist/main.bundle' was not found"
    );

    warnSpy.mockRestore();
  });
});
