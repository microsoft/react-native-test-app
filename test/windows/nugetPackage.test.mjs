// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { nugetPackage } from "../../windows/project.mjs";

describe("nugetPackage()", () => {
  it("returns a NuGet package entry", () => {
    equal(
      nugetPackage("com.reacttestapp.id", "1.0.0"),
      '<package id="com.reacttestapp.id" version="1.0.0" targetFramework="native"/>'
    );
  });
});
