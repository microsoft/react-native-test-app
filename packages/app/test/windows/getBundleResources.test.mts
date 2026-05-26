import { deepEqual, equal, match } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { getBundleResources as getBundleResourcesActual } from "../../windows/project.mjs";
import { fs, setMockFiles } from "../fs.mock.mts";

describe("getBundleResources()", () => {
  const getBundleResources: typeof getBundleResourcesActual = (p, opts) =>
    getBundleResourcesActual(p, opts, fs);

  const legacyOpts = { useFabric: false };
  const newArchOpts = { useFabric: true };

  afterEach(() => setMockFiles());

  for (const opts of [legacyOpts, newArchOpts]) {
    const arch = opts.useFabric ? "new" : "old";

    it(`returns package manifest (${arch} arch)`, () => {
      setMockFiles({
        "app.json": JSON.stringify({
          windows: {
            appxManifest: "windows/Example/Package.appxmanifest",
          },
        }),
      });

      deepEqual(getBundleResources("app.json", opts), {
        appName: "ReactTestApp",
        singleApp: undefined,
        appxManifest: "windows\\Example\\Package.appxmanifest",
        assetItems: "",
        assetItemFilters: "",
        assetFilters: "",
        contentItems: "",
        packageCertificate: "",
      });
    });

    it(`handles missing manifest (${arch} arch)`, (t) => {
      const warnMock = t.mock.method(console, "warn", () => null);

      deepEqual(getBundleResources("", opts), {
        appName: "ReactTestApp",
        appxManifest: "windows/Package.appxmanifest",
        assetItems: "",
        assetItemFilters: "",
        assetFilters: "",
        contentItems: "",
        packageCertificate: "",
      });

      equal(
        warnMock.mock.calls[0].arguments[1],
        "Could not find 'app.json' file."
      );
    });

    it(`handles invalid manifest (${arch} arch)`, (t) => {
      const warnMock = t.mock.method(console, "warn", () => null);
      setMockFiles({ "app.json": "-" });

      deepEqual(getBundleResources("app.json", opts), {
        appName: "ReactTestApp",
        appxManifest: "windows/Package.appxmanifest",
        assetItems: "",
        assetItemFilters: "",
        assetFilters: "",
        contentItems: "",
        packageCertificate: "",
      });

      match(
        warnMock.mock.calls[0].arguments[1],
        /^Could not parse 'app.json':\n/
      );
    });

    it(`returns package certificate (${arch} arch)`, () => {
      setMockFiles({
        "app.json": JSON.stringify({
          windows: {
            certificateKeyFile: "windows/ReactTestApp_TemporaryKey.pfx",
            certificateThumbprint: "thumbprint",
            certificatePassword: "password",
          },
        }),
      });

      const { packageCertificate } = getBundleResources("app.json", opts);
      equal(
        packageCertificate,
        `<AppxPackageSigningEnabled>true</AppxPackageSigningEnabled>
    <PackageCertificateKeyFile>$(ProjectRootDir)\\windows\\ReactTestApp_TemporaryKey.pfx</PackageCertificateKeyFile>
    <PackageCertificateThumbprint>thumbprint</PackageCertificateThumbprint>
    <PackageCertificatePassword>password</PackageCertificatePassword>`
      );
    });
  }

  it("returns app name and bundle resources (old arch)", () => {
    const assets = path.join("dist", "assets");
    const bundle = path.join("dist", "main.bundle");
    setMockFiles({
      "app.json": JSON.stringify({
        name: "Example",
        resources: [assets, bundle],
      }),
      [path.join(assets, "app.json")]: "{}",
      [bundle]: "'use strict';",
    });

    const {
      appName,
      appxManifest,
      assetItems,
      assetItemFilters,
      assetFilters,
      contentItems,
    } = getBundleResources("app.json", legacyOpts);

    equal(appName, "Example");
    equal(appxManifest, "windows\\Package.appxmanifest");
    equal(
      assetItems,
      `<CopyFileToFolders Include="$(ProjectRootDir)\\dist\\assets\\app.json">
      <DestinationFolders>$(OutDir)\\Bundle\\assets</DestinationFolders>
    </CopyFileToFolders>
    <CopyFileToFolders Include="$(ProjectRootDir)\\dist\\main.bundle">
      <DestinationFolders>$(OutDir)\\Bundle</DestinationFolders>
    </CopyFileToFolders>`
    );
    equal(
      assetItemFilters,
      `<CopyFileToFolders Include="$(ProjectRootDir)\\dist\\assets\\app.json">
      <Filter>Assets\\assets</Filter>
    </CopyFileToFolders>
    <CopyFileToFolders Include="$(ProjectRootDir)\\dist\\main.bundle">
      <Filter>Assets</Filter>
    </CopyFileToFolders>`
    );
    match(
      assetFilters,
      /^<Filter Include="Assets\\assets">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>$/
    );
    equal(contentItems, "");
  });

  it("returns app name and bundle resources (new arch)", () => {
    const assets = path.join("dist", "assets");
    const bundle = path.join("dist", "main.bundle");
    setMockFiles({
      "app.json": JSON.stringify({
        name: "Example",
        resources: [assets, bundle],
      }),
      [path.join(assets, "app.json")]: "{}",
      [bundle]: "'use strict';",
    });

    const {
      appName,
      appxManifest,
      assetItems,
      assetItemFilters,
      assetFilters,
      contentItems,
    } = getBundleResources("app.json", newArchOpts);

    equal(appName, "Example");
    equal(appxManifest, "windows\\Package.appxmanifest");
    equal(assetItems, "");
    equal(assetItemFilters, "");
    equal(assetFilters, "");
    equal(
      contentItems,
      `<Content Include="$(ProjectRootDir)\\dist\\assets\\app.json">
      <Link>Bundle\\assets\\app.json</Link>
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
    <Content Include="$(ProjectRootDir)\\dist\\main.bundle">
      <Link>Bundle\\main.bundle</Link>
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>`
    );
  });
});
