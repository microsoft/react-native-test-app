//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

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
    mockFiles(["app.json", { name: "Example" }]);
    expect(getAppName(".")).toBe("Example");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("falls back to 'ReactTestApp' if `name` is missing or empty", () => {
    mockFiles(["app.json", {}]);
    expect(getAppName(".")).toBe("ReactTestApp");

    mockFiles(["app.json", { name: "" }]);
    expect(getAppName(".")).toBe("ReactTestApp");

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test("falls back to 'ReactTestApp' if the app manifest is missing", () => {
    expect(getAppName(".")).toBe("ReactTestApp");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});
