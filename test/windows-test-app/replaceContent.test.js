// @ts-check
"use strict";

describe("replaceContent", () => {
  const { replaceContent } = require("../../windows/test-app");

  test("returns same string with no replacements", () => {
    // @ts-expect-error intentional use of `undefined`
    expect(replaceContent(undefined, {})).toBeUndefined();
    expect(replaceContent("", {})).toBe("");
    expect(replaceContent("content", {})).toBe("content");
  });

  test("replaces content only if patterns match", () => {
    expect(
      replaceContent("|$(ReactNativeModulePath)|", {
        "\\$\\(ReactNativeModulePath\\)": "Arnold",
        "\\$\\(ReactTestAppProjectPath\\)": "Schwarzenegger",
      })
    ).toBe("|Arnold|");
  });

  test("replaces all occurrences of given pattern", () => {
    expect(
      replaceContent(
        "|$(ReactNativeModulePath)|$(ReactNativeModulePath)|$(ReactNativeModulePath)|",
        { "\\$\\(ReactNativeModulePath\\)": "Arnold" }
      )
    ).toBe("|Arnold|Arnold|Arnold|");
  });
});
