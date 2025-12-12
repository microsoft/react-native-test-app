import { equal } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getAppName as getAppNameActual } from "../../scripts/configure.mjs";
import { fs, setMockFiles } from "../fs.mock.ts";

describe("getAppName()", () => {
  const getAppName: typeof getAppNameActual = (p) => getAppNameActual(p, fs);

  afterEach(() => setMockFiles());

  it("retrieves name from the app manifest", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);
    setMockFiles({ "app.json": `{ "name": "Example" }` });

    equal(getAppName("."), "Example");
    equal(warnMock.mock.calls.length, 0);
  });

  it("falls back to 'ReactTestApp' if `name` is missing or empty", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);
    setMockFiles({ "app.json": "{}" });

    equal(getAppName("."), "ReactTestApp");
    equal(warnMock.mock.calls.length, 1);

    setMockFiles({ "app.json": `{ name: "" }` });

    equal(getAppName("."), "ReactTestApp");
    equal(warnMock.mock.calls.length, 2);
  });

  it("falls back to 'ReactTestApp' if the app manifest is missing", (t) => {
    const warnMock = t.mock.method(console, "warn", () => null);

    equal(getAppName("."), "ReactTestApp");
    equal(warnMock.mock.calls.length, 1);
  });
});
