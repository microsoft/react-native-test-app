// @ts-check
import { equal } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getAppName as getAppNameActual } from "../../scripts/configure.js";
import { fs, setMockFiles } from "../fs.mock.mjs";
import { spy } from "../spy.mjs";

describe("getAppName()", () => {
  /** @type {typeof getAppNameActual} */
  const getAppName = (p) => getAppNameActual(p, fs);

  afterEach(() => setMockFiles());

  it("retrieves name from the app manifest", (t) => {
    t.mock.method(console, "warn", () => null);
    setMockFiles({ "app.json": `{ "name": "Example" }` });

    equal(getAppName("."), "Example");
    equal(spy(console.warn).calls.length, 0);
  });

  it("falls back to 'ReactTestApp' if `name` is missing or empty", (t) => {
    t.mock.method(console, "warn", () => null);
    setMockFiles({ "app.json": "{}" });

    equal(getAppName("."), "ReactTestApp");
    equal(spy(console.warn).calls.length, 1);

    setMockFiles({ "app.json": `{ name: "" }` });

    equal(getAppName("."), "ReactTestApp");
    equal(spy(console.warn).calls.length, 2);
  });

  it("falls back to 'ReactTestApp' if the app manifest is missing", (t) => {
    t.mock.method(console, "warn", () => null);

    equal(getAppName("."), "ReactTestApp");
    equal(spy(console.warn).calls.length, 1);
  });
});
