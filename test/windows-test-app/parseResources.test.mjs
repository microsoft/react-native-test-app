// @ts-check
import { deepEqual, equal, match } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { parseResources as parseResourcesActual } from "../../windows/test-app.js";
import { fs, setMockFiles } from "../fs.mock.mjs";
import { spy } from "../spy.mjs";

describe("parseResources()", () => {
  /** @type {typeof parseResourcesActual} */
  const parseResources = (r, p) => parseResourcesActual(r, p, fs);

  const empty = { assetFilters: "", assetItemFilters: "", assetItems: "" };

  afterEach(() => setMockFiles());

  it("returns empty strings for no resources", () => {
    deepEqual(parseResources(undefined, ""), empty);
    deepEqual(parseResources([], ""), empty);
    deepEqual(parseResources({}, ""), empty);
    deepEqual(parseResources({ windows: [] }, ""), empty);
  });

  it("returns references to existing assets", () => {
    setMockFiles({
      "dist/assets/node_modules/arnold/portrait.png": "{}",
      "dist/assets/splash.png": "{}",
      "dist/main.jsbundle": "'use strict';",
    });

    const { assetItems, assetItemFilters, assetFilters } = parseResources(
      ["dist/assets", "dist/main.jsbundle"],
      "."
    );
    equal(
      assetItems,
      `<CopyFileToFolders Include="$(ProjectRootDir)\\dist\\assets\\node_modules\\arnold\\portrait.png">
      <DestinationFolders>$(OutDir)\\Bundle\\assets\\node_modules\\arnold</DestinationFolders>
    </CopyFileToFolders>
    <CopyFileToFolders Include="$(ProjectRootDir)\\dist\\assets\\splash.png">
      <DestinationFolders>$(OutDir)\\Bundle\\assets</DestinationFolders>
    </CopyFileToFolders>
    <CopyFileToFolders Include="$(ProjectRootDir)\\dist\\main.jsbundle">
      <DestinationFolders>$(OutDir)\\Bundle</DestinationFolders>
    </CopyFileToFolders>`
    );
    equal(
      assetItemFilters,
      `<CopyFileToFolders Include="$(ProjectRootDir)\\dist\\assets\\node_modules\\arnold\\portrait.png">
      <Filter>Assets\\assets\\node_modules\\arnold</Filter>
    </CopyFileToFolders>
    <CopyFileToFolders Include="$(ProjectRootDir)\\dist\\assets\\splash.png">
      <Filter>Assets\\assets</Filter>
    </CopyFileToFolders>
    <CopyFileToFolders Include="$(ProjectRootDir)\\dist\\main.jsbundle">
      <Filter>Assets</Filter>
    </CopyFileToFolders>`
    );
    match(
      assetFilters,
      /^<Filter Include="Assets\\assets">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>\s+<Filter Include="Assets\\assets\\node_modules">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>\s+<Filter Include="Assets\\assets\\node_modules\\arnold">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>$/
    );
  });

  it("skips missing assets", (t) => {
    t.mock.method(console, "warn", () => null);

    deepEqual(parseResources(["dist/assets", "dist/main.bundle"], "."), empty);

    equal(
      spy(console.warn).calls[0].arguments[0],
      "warning: resource with path 'dist/assets' was not found"
    );
    equal(
      spy(console.warn).calls[1].arguments[0],
      "warning: resource with path 'dist/main.bundle' was not found"
    );
  });
});
