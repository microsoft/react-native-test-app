//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("getVersionNumber", () => {
  const { getVersionNumber } = require("../../windows/test-app");

  test("handles arbitrary version number formats", () => {
    expect(getVersionNumber("0")).toBe(0);
    expect(getVersionNumber("1")).toBe(1);
    expect(getVersionNumber("11")).toBe(11);

    expect(getVersionNumber("0.0")).toBe(0);
    expect(getVersionNumber("0.1")).toBe(1);
    expect(getVersionNumber("1.0")).toBe(100);
    expect(getVersionNumber("1.1")).toBe(101);

    expect(getVersionNumber("0.0.0")).toBe(0);
    expect(getVersionNumber("0.0.1")).toBe(1);
    expect(getVersionNumber("0.1.0")).toBe(100);
    expect(getVersionNumber("0.1.1")).toBe(101);
    expect(getVersionNumber("1.0.0")).toBe(10000);
    expect(getVersionNumber("1.0.1")).toBe(10001);
    expect(getVersionNumber("1.1.0")).toBe(10100);
    expect(getVersionNumber("1.1.1")).toBe(10101);

    expect(getVersionNumber("0.0.0.0")).toBe(0);
    expect(getVersionNumber("0.0.0.1")).toBe(1);
    expect(getVersionNumber("0.0.1.0")).toBe(100);
    expect(getVersionNumber("0.0.1.1")).toBe(101);
    expect(getVersionNumber("0.1.0.0")).toBe(10000);
    expect(getVersionNumber("0.1.0.1")).toBe(10001);
    expect(getVersionNumber("0.1.1.0")).toBe(10100);
    expect(getVersionNumber("0.1.1.1")).toBe(10101);
    expect(getVersionNumber("1.0.0.0")).toBe(1000000);
    expect(getVersionNumber("1.0.0.1")).toBe(1000001);
    expect(getVersionNumber("1.0.1.0")).toBe(1000100);
    expect(getVersionNumber("1.0.1.1")).toBe(1000101);
    expect(getVersionNumber("1.1.0.0")).toBe(1010000);
    expect(getVersionNumber("1.1.0.1")).toBe(1010001);
    expect(getVersionNumber("1.1.1.0")).toBe(1010100);
    expect(getVersionNumber("1.1.1.1")).toBe(1010101);
  });
});
