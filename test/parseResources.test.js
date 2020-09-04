jest.mock("fs");

describe("parseResources", () => {
  const { parseResources } = require("../windows/test-app");

  afterEach(() => require("fs").__setMockFiles({}));

  test("returns empty strings for no resources", () => {
    expect(parseResources(undefined, "", "")).toEqual(["", ""]);
    expect(parseResources([], "", "")).toEqual(["", ""]);
    expect(parseResources({}, "", "")).toEqual(["", ""]);
    expect(parseResources({ windows: {} }, "", "")).toEqual(["", ""]);
  });

  test("returns references to existing assets", () => {
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
