// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { error, warn } from "../../scripts/configure.mjs";
import { spy } from "../spy.mjs";

describe("console", () => {
  it("error() is just a fancy console.error()", (t) => {
    t.mock.method(console, "error", () => null);
    t.mock.method(console, "warn", () => null);

    error("These tests are seriously lacking Arnold.");
    equal(spy(console.error).calls.length, 1);
    equal(spy(console.warn).calls.length, 0);
  });

  it("warn() is just a fancy console.warn()", (t) => {
    t.mock.method(console, "error", () => null);
    t.mock.method(console, "warn", () => null);

    warn("These tests are lacking Arnold.");
    equal(spy(console.error).calls.length, 0);
    equal(spy(console.warn).calls.length, 1);
  });
});
