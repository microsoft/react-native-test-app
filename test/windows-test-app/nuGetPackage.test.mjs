// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { nuGetPackage } from "../../windows/test-app.mjs";

describe("nuGetPackage()", () => {
  it("returns a NuGet package entry", () => {
    equal(
      nuGetPackage("com.reacttestapp.id", "1.0.0"),
      '<package id="com.reacttestapp.id" version="1.0.0" targetFramework="native"/>'
    );
  });
});
