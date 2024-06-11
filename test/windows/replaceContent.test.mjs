// @ts-check
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { replaceContent } from "../../windows/test-app.mjs";

describe("replaceContent()", () => {
  it("returns same string with no replacements", () => {
    // @ts-expect-error intentional use of `undefined`
    equal(replaceContent(undefined, {}), undefined);
    equal(replaceContent("", {}), "");
    equal(replaceContent("content", {}), "content");
  });

  it("replaces content only if patterns match", () => {
    equal(
      replaceContent("|$(ReactNativeModulePath)|", {
        "\\$\\(ReactNativeModulePath\\)": "Arnold",
        "\\$\\(ReactTestAppProjectPath\\)": "Schwarzenegger",
      }),
      "|Arnold|"
    );
  });

  it("replaces all occurrences of given pattern", () => {
    equal(
      replaceContent(
        "|$(ReactNativeModulePath)|$(ReactNativeModulePath)|$(ReactNativeModulePath)|",
        { "\\$\\(ReactNativeModulePath\\)": "Arnold" }
      ),
      "|Arnold|Arnold|Arnold|"
    );
  });
});
