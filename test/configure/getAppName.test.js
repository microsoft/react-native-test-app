// @ts-check
"use strict";

describe("getAppName()", () => {
  const fs = require("../fs.mock");
  const { getAppName: getAppNameActual } = require("../../scripts/configure");

  /** @type {typeof getAppNameActual} */
  const getAppName = (p) => getAppNameActual(p, fs);

  const consoleSpy = jest.spyOn(global.console, "warn");

  afterEach(() => {
    fs.__setMockFiles();
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("retrieves name from the app manifest", () => {
    fs.__setMockFiles({ "app.json": `{ "name": "Example" }` });
    expect(getAppName(".")).toBe("Example");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("falls back to 'ReactTestApp' if `name` is missing or empty", () => {
    fs.__setMockFiles({ "app.json": "{}" });
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockReset();

    fs.__setMockFiles({ "app.json": `{ name: "" }` });
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  test("falls back to 'ReactTestApp' if the app manifest is missing", () => {
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
