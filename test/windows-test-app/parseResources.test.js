//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

jest.mock("fs");

describe("parseResources", () => {
  const { mockFiles } = require("../mockFiles");
  const { parseResources } = require("../../windows/test-app");

  const empty = { assetFilters: "", assetItemFilters: "", assetItems: "" };

  afterEach(() => mockFiles());

  test("returns empty strings for no resources", () => {
    expect(parseResources(undefined, "", "")).toEqual(empty);
    expect(parseResources([], "", "")).toEqual(empty);
    expect(parseResources({}, "", "")).toEqual(empty);
    expect(parseResources({ windows: [] }, "", "")).toEqual(empty);
  });

  test("returns references to existing assets", () => {
    mockFiles({
      "dist/assets/app.json": "{}",
      "dist/assets/node_modules/arnold/portrait.png": "{}",
      "dist/assets/splash.png": "{}",
      "dist/main.jsbundle": "'use strict';",
    });

    const { assetItems, assetItemFilters, assetFilters } = parseResources(
      ["dist/assets", "dist/main.jsbundle"],
      ".",
      "node_modules/.generated/windows/ReactTestApp"
    );
    expect(assetItems).toMatchInlineSnapshot(`
"<CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\assets\\\\node_modules\\\\arnold\\\\portrait.png\\">
      <DestinationFolders>$(OutDir)\\\\Bundle\\\\assets\\\\node_modules\\\\arnold</DestinationFolders>
    </CopyFileToFolders>
    <CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\assets\\\\splash.png\\">
      <DestinationFolders>$(OutDir)\\\\Bundle\\\\assets</DestinationFolders>
    </CopyFileToFolders>
    <CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\main.jsbundle\\">
      <DestinationFolders>$(OutDir)\\\\Bundle</DestinationFolders>
    </CopyFileToFolders>"
`);
    expect(assetItemFilters).toMatchInlineSnapshot(`
      "<CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\assets\\\\node_modules\\\\arnold\\\\portrait.png\\">
            <Filter>Assets\\\\assets\\\\node_modules\\\\arnold</Filter>
          </CopyFileToFolders>
          <CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\assets\\\\splash.png\\">
            <Filter>Assets\\\\assets</Filter>
          </CopyFileToFolders>
          <CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\main.jsbundle\\">
            <Filter>Assets</Filter>
          </CopyFileToFolders>"
    `);
    expect(assetFilters).toEqual(
      expect.stringMatching(
        /^<Filter Include="Assets\\assets">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>\s+<Filter Include="Assets\\assets\\node_modules">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>\s+<Filter Include="Assets\\assets\\node_modules\\arnold">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>$/
      )
    );
  });

  test("skips missing assets", () => {
    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    expect(
      parseResources(
        ["dist/assets", "dist/main.bundle"],
        ".",
        "node_modules/.generated/windows/ReactTestApp"
      )
    ).toEqual(empty);

    expect(warnSpy).toHaveBeenCalledWith(
      "warning: resource with path 'dist/assets' was not found"
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "warning: resource with path 'dist/main.bundle' was not found"
    );

    warnSpy.mockRestore();
  });
});
