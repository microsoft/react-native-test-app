// @ts-check
import { equal } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getAppName as getAppNameActual } from "../../scripts/configure.js";
import fs from "../fs.mock.js";
import spy from "../spy.mjs";

describe("getAppName()", () => {
  /** @type {typeof getAppNameActual} */
  const getAppName = (p) => getAppNameActual(p, fs);

  afterEach(() => fs.__setMockFiles());

  it("retrieves name from the app manifest", (t) => {
    t.mock.method(console, "warn", () => null);
    fs.__setMockFiles({ "app.json": `{ "name": "Example" }` });

    equal(getAppName("."), "Example");
    equal(spy(console.warn).calls.length, 0);
  });

  it("falls back to 'ReactTestApp' if `name` is missing or empty", (t) => {
    t.mock.method(console, "warn", () => null);
    fs.__setMockFiles({ "app.json": "{}" });

    equal(getAppName("."), "ReactTestApp");
    equal(spy(console.warn).calls.length, 1);

    fs.__setMockFiles({ "app.json": `{ name: "" }` });

    equal(getAppName("."), "ReactTestApp");
    equal(spy(console.warn).calls.length, 2);
  });

  it("falls back to 'ReactTestApp' if the app manifest is missing", (t) => {
    t.mock.method(console, "warn", () => null);

    equal(getAppName("."), "ReactTestApp");
    equal(spy(console.warn).calls.length, 1);
  });
});
