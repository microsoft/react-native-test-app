import { equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseMSBuildProperties } from "../../windows/app.mjs";

describe("parseMSBuildProperties()", () => {
  it("handles empty string", () => {
    ok(!parseMSBuildProperties(undefined), "should return undefined");
    ok(!parseMSBuildProperties(""), "should return undefined");
  });

  it("parses single property", () => {
    equal(parseMSBuildProperties("Prop=Value"), "<Prop>Value</Prop>");
  });

  it("parses multiple properties", () => {
    equal(
      parseMSBuildProperties("Prop1=Value1,Prop2=Value2"),
      "<Prop1>Value1</Prop1>\n<Prop2>Value2</Prop2>"
    );
  });

  it("throws on invalid input", () => {
    throws(() => parseMSBuildProperties("NULL"));
    throws(() => parseMSBuildProperties("Prop="));
    throws(() => parseMSBuildProperties("=Value"));
    throws(() => parseMSBuildProperties("Prop=Value,"));
  });
});
