// @ts-check
"use strict";

describe("nuGetPackage", () => {
  const { nuGetPackage } = require("../../windows/test-app");

  test("returns a NuGet package entry", () => {
    expect(nuGetPackage("com.reacttestapp.id", "1.0.0")).toBe(
      '<package id="com.reacttestapp.id" version="1.0.0" targetFramework="native" />'
    );
  });
});
