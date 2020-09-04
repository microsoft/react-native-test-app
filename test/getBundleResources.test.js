jest.mock("fs");

describe("getBundleResources", () => {
  const path = require("path");
  const { getBundleResources } = require("../windows/test-app");

  afterEach(() => require("fs").__setMockFiles({}));

  test("returns app name and bundle resources", () => {
    const assets = path.join("dist", "assets");
    const bundle = path.join("dist", "main.bundle");
    require("fs").__setMockFiles({
      "app.json": JSON.stringify({
        name: "Example",
        resources: [assets, bundle],
      }),
      [assets]: "directory",
      [bundle]: "text",
    });

    const [appName, bundleDirContent, bundleFileContent] = getBundleResources(
      "app.json",
      path.resolve("")
    );

    expect(appName).toBe("Example");
    expect(bundleDirContent).toBe(`${assets}\\**\\*;`);
    expect(bundleFileContent).toBe(`${bundle};`);
  });

  test("handles missing manifest", () => {
    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    const [appName, bundleDirContent, bundleFileContent] = getBundleResources(
      "",
      ""
    );

    expect(appName).toBe("ReactTestApp");
    expect(bundleDirContent).toBeFalsy();
    expect(bundleFileContent).toBeFalsy();

    expect(warnSpy).toHaveBeenCalledWith("Could not find 'app.json' file.");

    warnSpy.mockRestore();
  });

  test("handles invalid manifest", () => {
    require("fs").__setMockFiles({
      "app.json": "-",
    });

    const warnSpy = jest.spyOn(global.console, "warn").mockImplementation();

    const [appName, bundleDirContent, bundleFileContent] = getBundleResources(
      "app.json",
      path.resolve("")
    );

    expect(appName).toBe("ReactTestApp");
    expect(bundleDirContent).toBeFalsy();
    expect(bundleFileContent).toBeFalsy();

    expect(warnSpy).toHaveBeenCalledWith(
      "Could not parse 'app.json':\nUnexpected end of JSON input"
    );

    warnSpy.mockRestore();
  });
});
