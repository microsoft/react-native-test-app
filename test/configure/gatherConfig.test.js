// @ts-check
"use strict";

describe("gatherConfig()", () => {
  const { mockParams } = require("./mockParams");
  const { gatherConfig } = require("../../scripts/configure");

  test("returns configuration for all platforms", () => {
    expect(gatherConfig(mockParams())).toMatchSnapshot();
  });

  test("returns common configuration", () => {
    expect(
      gatherConfig(mockParams({ platforms: ["common"] }))
    ).toMatchSnapshot();
  });

  test("returns configuration for a single platform", () => {
    expect(gatherConfig(mockParams({ platforms: ["ios"] }))).toMatchSnapshot();
  });

  test("returns configuration for arbitrary platforms", () => {
    const params = mockParams({ platforms: ["android", "ios"] });
    expect(gatherConfig(params)).toMatchSnapshot();
  });

  test("flattens configuration for a single platform only", () => {
    const iosOnly = mockParams({ platforms: ["ios"], flatten: true });
    expect(gatherConfig(iosOnly)).toMatchSnapshot();

    const mobile = mockParams({ platforms: ["android", "ios"], flatten: true });
    expect(gatherConfig(mobile)).toMatchSnapshot();
  });
});
