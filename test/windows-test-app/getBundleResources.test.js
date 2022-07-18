// @ts-check
"use strict";

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

    const {
      appName,
      appxManifest,
      assetItems,
      assetItemFilters,
      assetFilters,
    } = getBundleResources("app.json", path.resolve(""));

    expect(appName).toBe("Example");
    expect(appxManifest).toBe("windows\\Package.appxmanifest");
    expect(assetItems).toMatchInlineSnapshot(`
      "<CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\assets\\\\app.json\\">
            <DestinationFolders>$(OutDir)\\\\Bundle\\\\assets</DestinationFolders>
          </CopyFileToFolders>
          <CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\main.bundle\\">
            <DestinationFolders>$(OutDir)\\\\Bundle</DestinationFolders>
          </CopyFileToFolders>"
    `);
    expect(assetItemFilters).toMatchInlineSnapshot(`
      "<CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\assets\\\\app.json\\">
            <Filter>Assets\\\\assets</Filter>
          </CopyFileToFolders>
          <CopyFileToFolders Include=\\"$(ProjectRootDir)\\\\dist\\\\main.bundle\\">
            <Filter>Assets</Filter>
          </CopyFileToFolders>"
    `);
    expect(assetFilters).toEqual(
      expect.stringMatching(
        /^<Filter Include="Assets\\assets">\s+<UniqueIdentifier>{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}<\/UniqueIdentifier>\s+<\/Filter>$/
      )
    );
  });

  test("returns package manifest", () => {
    mockFiles({
      "app.json": JSON.stringify({
        windows: {
          appxManifest: "windows/Example/Package.appxmanifest",
        },
      }),
    });

    expect(getBundleResources("app.json", path.resolve(""))).toEqual({
      appName: "ReactTestApp",
      appxManifest: "windows\\Example\\Package.appxmanifest",
      assetItems: "",
      assetItemFilters: "",
      assetFilters: "",
      packageCertificate: "",
    });
  });

  test("handles missing manifest", () => {
    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    expect(getBundleResources("", "")).toEqual({
      appName: "ReactTestApp",
      appxManifest: "windows/Package.appxmanifest",
      assetItems: "",
      assetItemFilters: "",
      assetFilters: "",
      packageCertificate: "",
    });

    expect(warnSpy).toHaveBeenCalledWith("Could not find 'app.json' file.");

    warnSpy.mockRestore();
  });

  test("handles invalid manifest", () => {
    mockFiles({ "app.json": "-" });

    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    expect(getBundleResources("app.json", path.resolve(""))).toEqual({
      appName: "ReactTestApp",
      appxManifest: "windows/Package.appxmanifest",
      assetItems: "",
      assetItemFilters: "",
      assetFilters: "",
      packageCertificate: "",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "Could not parse 'app.json':\nUnexpected end of JSON input"
    );

    warnSpy.mockRestore();
  });

  test("returns package certificate", () => {
    mockFiles({
      "app.json": JSON.stringify({
        windows: {
          certificateKeyFile: "windows/ReactTestApp_TemporaryKey.pfx",
          certificateThumbprint: "thumbprint",
          certificatePassword: "password",
        },
      }),
    });

    const { packageCertificate } = getBundleResources(
      "app.json",
      path.resolve("")
    );
    expect(packageCertificate).toMatchInlineSnapshot(`
      "<AppxPackageSigningEnabled>true</AppxPackageSigningEnabled>
          <PackageCertificateKeyFile>$(ProjectRootDir)\\\\windows\\\\ReactTestApp_TemporaryKey.pfx</PackageCertificateKeyFile>
          <PackageCertificateThumbprint>thumbprint</PackageCertificateThumbprint>
          <PackageCertificatePassword>password</PackageCertificatePassword>"
    `);
  });
});
