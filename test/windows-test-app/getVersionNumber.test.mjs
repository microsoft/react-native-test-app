// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { getVersionNumber } from "../../windows/test-app.js";

describe("getVersionNumber()", () => {
  it("handles arbitrary version number formats", () => {
    equal(getVersionNumber("0"), 0);
    equal(getVersionNumber("1"), 1);
    equal(getVersionNumber("11"), 11);

    equal(getVersionNumber("0.0"), 0);
    equal(getVersionNumber("0.1"), 1);
    equal(getVersionNumber("1.0"), 100);
    equal(getVersionNumber("1.1"), 101);

    equal(getVersionNumber("0.0.0"), 0);
    equal(getVersionNumber("0.0.1"), 1);
    equal(getVersionNumber("0.1.0"), 100);
    equal(getVersionNumber("0.1.1"), 101);
    equal(getVersionNumber("1.0.0"), 10000);
    equal(getVersionNumber("1.0.1"), 10001);
    equal(getVersionNumber("1.1.0"), 10100);
    equal(getVersionNumber("1.1.1"), 10101);

    equal(getVersionNumber("0.0.0.0"), 0);
    equal(getVersionNumber("0.0.0.1"), 1);
    equal(getVersionNumber("0.0.1.0"), 100);
    equal(getVersionNumber("0.0.1.1"), 101);
    equal(getVersionNumber("0.1.0.0"), 10000);
    equal(getVersionNumber("0.1.0.1"), 10001);
    equal(getVersionNumber("0.1.1.0"), 10100);
    equal(getVersionNumber("0.1.1.1"), 10101);
    equal(getVersionNumber("1.0.0.0"), 1000000);
    equal(getVersionNumber("1.0.0.1"), 1000001);
    equal(getVersionNumber("1.0.1.0"), 1000100);
    equal(getVersionNumber("1.0.1.1"), 1000101);
    equal(getVersionNumber("1.1.0.0"), 1010000);
    equal(getVersionNumber("1.1.0.1"), 1010001);
    equal(getVersionNumber("1.1.1.0"), 1010100);
    equal(getVersionNumber("1.1.1.1"), 1010101);

    equal(getVersionNumber("1.0.0-rc.1"), 10000);
  });
});
