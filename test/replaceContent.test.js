//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

describe("replaceContent", () => {
  const { replaceContent } = require("../windows/test-app");

  test("returns same string with no replacements", () => {
    // @ts-ignore intentional use of `undefined`
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
