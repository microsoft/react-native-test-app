import { deepEqual, equal, match } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { parseResources as parseResourcesActual } from "../../windows/project.mjs";
import { fs, setMockFiles } from "../fs.mock.mts";

describe("parseResources()", () => {
  const parseResources: typeof parseResourcesActual = (r, p, opts) =>
    parseResourcesActual(r, p, opts, fs);

  const empty = {
    assetFilters: "",
    assetItemFilters: "",
    assetItems: "",
    contentItems: "",
  };

  const legacyOpts = { useFabric: false };
  const newArchOpts = { useFabric: true };

  afterEach(() => setMockFiles());

  for (const opts of [legacyOpts, newArchOpts]) {
    const arch = opts.useFabric ? "new" : "old";

    it(`returns empty strings for no resources (${arch} arch)`, () => {
      deepEqual(parseResources(undefined, "", opts), empty);
      deepEqual(parseResources([], "", opts), empty);
      deepEqual(parseResources({}, "", opts), empty);
      deepEqual(parseResources({ windows: [] }, "", opts), empty);
    });

    it(`skips missing assets (${arch} arch)`, (t) => {
      const warnMock = t.mock.method(console, "warn", () => null);

      const resources = ["dist/assets", "dist/main.bundle"];

      deepEqual(parseResources(resources, ".", opts), empty);

      equal(
        warnMock.mock.calls[0].arguments[1],
        "Resource not found: dist/assets"
      );
      equal(
        warnMock.mock.calls[1].arguments[1],
        "Resource not found: dist/main.bundle"
      );
    });
  }

  it("returns references to existing assets (old arch)", () => {
    setMockFiles({
      "dist/assets/node_modules/arnold/portrait.png": "{}",
      "dist/assets/splash.png": "{}",
      "dist/main.jsbundle": "'use strict';",
    });

    const { assetItems, assetItemFilters, assetFilters, contentItems } =
      parseResources(["dist/assets", "dist/main.jsbundle"], ".", legacyOpts);

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
    equal(contentItems, "");
  });

  it("returns references to existing assets (new arch)", () => {
    setMockFiles({
      "dist/assets/node_modules/arnold/portrait.png": "{}",
      "dist/assets/splash.png": "{}",
      "dist/main.jsbundle": "'use strict';",
    });

    const { assetItems, assetItemFilters, assetFilters, contentItems } =
      parseResources(["dist/assets", "dist/main.jsbundle"], ".", newArchOpts);

    equal(assetItems, "");
    equal(assetItemFilters, "");
    equal(assetFilters, "");
    equal(
      contentItems,
      `<Content Include="$(ProjectRootDir)\\dist\\assets\\node_modules\\arnold\\portrait.png">
      <Link>Bundle\\assets\\node_modules\\arnold\\portrait.png</Link>
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="$(ProjectRootDir)\\dist\\assets\\splash.png">
      <Link>Bundle\\assets\\splash.png</Link>
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="$(ProjectRootDir)\\dist\\main.jsbundle">
      <Link>Bundle\\main.jsbundle</Link>
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>`
    );
  });
});
