import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { error, warn } from "../../scripts/configure.mjs";

describe("console", () => {
  it("error() is just a fancy console.error()", (t) => {
    const errorMock = t.mock.method(console, "error", () => null);
    const warnMock = t.mock.method(console, "warn", () => null);

    error("These tests are seriously lacking Arnold.");
    equal(errorMock.mock.calls.length, 1);
    equal(warnMock.mock.calls.length, 0);
  });

  it("warn() is just a fancy console.warn()", (t) => {
    const errorMock = t.mock.method(console, "error", () => null);
    const warnMock = t.mock.method(console, "warn", () => null);

    warn("These tests are lacking Arnold.");
    equal(errorMock.mock.calls.length, 0);
    equal(warnMock.mock.calls.length, 1);
  });
});
