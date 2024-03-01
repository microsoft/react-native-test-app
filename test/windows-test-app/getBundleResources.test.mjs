// @ts-check
import { deepEqual, equal, match } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { getBundleResources as getBundleResourcesActual } from "../../windows/project.mjs";
import { fs, setMockFiles } from "../fs.mock.mjs";
import { spy } from "../spy.mjs";

describe("getBundleResources()", () => {
  /** @type {typeof getBundleResourcesActual} */
  const getBundleResources = (p) => getBundleResourcesActual(p, fs);

  afterEach(() => setMockFiles());

  it("returns app name and bundle resources", () => {
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
    } = getBundleResources("app.json");

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
  });

  it("returns package manifest", () => {
    setMockFiles({
      "app.json": JSON.stringify({
        windows: {
          appxManifest: "windows/Example/Package.appxmanifest",
        },
      }),
    });

    deepEqual(getBundleResources("app.json"), {
      appName: "ReactTestApp",
      singleApp: undefined,
      appxManifest: "windows\\Example\\Package.appxmanifest",
      assetItems: "",
      assetItemFilters: "",
      assetFilters: "",
      packageCertificate: "",
    });
  });

  it("handles missing manifest", (t) => {
    t.mock.method(console, "warn", () => null);

    deepEqual(getBundleResources(""), {
      appName: "ReactTestApp",
      appxManifest: "windows/Package.appxmanifest",
      assetItems: "",
      assetItemFilters: "",
      assetFilters: "",
      packageCertificate: "",
    });

    equal(
      spy(console.warn).calls[0].arguments[0],
      "Could not find 'app.json' file."
    );
  });

  it("handles invalid manifest", (t) => {
    t.mock.method(console, "warn", () => null);
    setMockFiles({ "app.json": "-" });

    deepEqual(getBundleResources("app.json"), {
      appName: "ReactTestApp",
      appxManifest: "windows/Package.appxmanifest",
      assetItems: "",
      assetItemFilters: "",
      assetFilters: "",
      packageCertificate: "",
    });

    match(
      spy(console.warn).calls[0].arguments[0],
      /^Could not parse 'app.json':\n/
    );
  });

  it("returns package certificate", () => {
    setMockFiles({
      "app.json": JSON.stringify({
        windows: {
          certificateKeyFile: "windows/ReactTestApp_TemporaryKey.pfx",
          certificateThumbprint: "thumbprint",
          certificatePassword: "password",
        },
      }),
    });

    const { packageCertificate } = getBundleResources("app.json");
    equal(
      packageCertificate,
      `<AppxPackageSigningEnabled>true</AppxPackageSigningEnabled>
    <PackageCertificateKeyFile>$(ProjectRootDir)\\windows\\ReactTestApp_TemporaryKey.pfx</PackageCertificateKeyFile>
    <PackageCertificateThumbprint>thumbprint</PackageCertificateThumbprint>
    <PackageCertificatePassword>password</PackageCertificatePassword>`
    );
  });
});
