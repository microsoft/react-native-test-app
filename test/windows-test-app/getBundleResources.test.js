//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

describe("getBundleResources", () => {
  const path = require("path");
  const { mockFiles } = require("../mockFiles");
  const { getBundleResources } = require("../../windows/test-app");

  afterEach(() => mockFiles());

  test("returns app name and bundle resources", () => {
    const assets = path.join("dist", "assets");
    const bundle = path.join("dist", "main.bundle");
    mockFiles({
      "app.json": JSON.stringify({
        name: "Example",
        resources: [assets, bundle],
      }),
      [path.join(assets, "app.json")]: "{}",
      [bundle]: "'use strict';",
    });

    const { appName, appxManifest, bundleDirContent, bundleFileContent } =
      getBundleResources("app.json", path.resolve(""));

    expect(appName).toBe("Example");
    expect(appxManifest).toBe("windows/Package.appxmanifest");
    expect(bundleDirContent).toBe(`${assets}\\**\\*;`);
    expect(bundleFileContent).toBe(`${bundle};`);
  });

  test("returns package manifest", () => {
    mockFiles({
      "app.json": JSON.stringify({
        windows: {
          appxManifest: "windows/Example/Package.appxmanifest",
        },
      }),
    });

    const { appName, appxManifest, bundleDirContent, bundleFileContent } =
      getBundleResources("app.json", path.resolve(""));

    expect(appName).toBe("ReactTestApp");
    expect(appxManifest).toBe("windows/Example/Package.appxmanifest");
    expect(bundleDirContent).toBe("");
    expect(bundleFileContent).toBe("");
  });

  test("handles missing manifest", () => {
    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    const { appName, appxManifest, bundleDirContent, bundleFileContent } =
      getBundleResources("", "");

    expect(appName).toBe("ReactTestApp");
    expect(appxManifest).toBe("windows/Package.appxmanifest");
    expect(bundleDirContent).toBeFalsy();
    expect(bundleFileContent).toBeFalsy();

    expect(warnSpy).toHaveBeenCalledWith("Could not find 'app.json' file.");

    warnSpy.mockRestore();
  });

  test("handles invalid manifest", () => {
    mockFiles({ "app.json": "-" });

    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    const { appName, appxManifest, bundleDirContent, bundleFileContent } =
      getBundleResources("app.json", path.resolve(""));

    expect(appName).toBe("ReactTestApp");
    expect(appxManifest).toBe("windows/Package.appxmanifest");
    expect(bundleDirContent).toBeFalsy();
    expect(bundleFileContent).toBeFalsy();

    expect(warnSpy).toHaveBeenCalledWith(
      "Could not parse 'app.json':\nUnexpected end of JSON input"
    );

    warnSpy.mockRestore();
  });
});
