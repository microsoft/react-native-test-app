// @ts-check
"use strict";

jest.mock("fs");

describe("getAppName()", () => {
  const { mockFiles } = require("../mockFiles");
  const { getAppName } = require("../../scripts/configure");

  const consoleSpy = jest.spyOn(global.console, "warn");

  afterEach(() => {
    mockFiles();
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("retrieves name from the app manifest", () => {
    mockFiles({ "app.json": `{ "name": "Example" }` });
    expect(getAppName(".")).toBe("Example");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("falls back to 'ReactTestApp' if `name` is missing or empty", () => {
    mockFiles({ "app.json": "{}" });
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockReset();

    mockFiles({ "app.json": `{ name: "" }` });
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  test("falls back to 'ReactTestApp' if the app manifest is missing", () => {
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
