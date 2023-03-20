#!/usr/bin/env node
// @ts-check

import { fileURLToPath } from "node:url";

const maxLineLength = 72;
const commitTypes = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
];

/**
 * @param {string} message
 * @returns {string[]} An array of issues
 */
function lint(message) {
  if (!message) {
    return ["empty"];
  }

  const m = message.match(/^(\w*?)(?:\((.*?)\))?[!]?:(.*)/s);
  if (!m) {
    return ["format"];
  }

  const [, type, scope, description] = m;
  const issues = new Set();

  if (type.toLowerCase() !== type) {
    issues.add("type-case");
  }

  if (!commitTypes.includes(type.toLowerCase())) {
    issues.add("type");
  }

  if (typeof scope === "string") {
    if (!scope) {
      issues.add("scope");
    } else if (scope.toLowerCase() !== scope) {
      issues.add("scope-case");
    }
  }

  if (!description) {
    issues.add("title");
  } else if (!description.startsWith(" ")) {
    issues.add("space-after-colon");
  }

  const [title, emptyLine, ...body] = description.split("\n");
  if (!title.trim()) {
    issues.add("title");
  }
  if (emptyLine) {
    issues.add("paragraph");
  }
  if (body.some((line) => line.length > maxLineLength)) {
    issues.add("body-line-length");
  }

  return Array.from(issues);
}

function main() {
  const data = [];
  const stdin = process.openStdin();
  stdin.setEncoding("utf8");
  stdin.on("data", (chunk) => data.push(chunk));
  stdin.on("end", () => {
    const message = data.join("").trim();
    const issues = lint(message);
    if (issues.length > 0) {
      process.exitCode = issues.length;
      for (const issue of issues) {
        switch (issue) {
          case "body-line-length":
            console.error(
              `✖ Body line length should not exceed ${maxLineLength} characters`
            );
            break;

          case "empty":
            console.error("✖ No commit message");
            break;

          case "format":
            console.error(
              "✖ Commit message doesn't seem to be following conventional format: type(optional scope): description"
            );
            break;

          case "paragraph":
            console.error("✖ Title and body must be separated by a newline");
            break;

          case "scope":
            console.error("✖ Scope cannot be empty");
            break;

          case "scope-case":
            console.error("✖ Scope must be all lower case");
            break;

          case "space-after-colon":
            console.error("✖ Space after `:` is required");
            break;

          case "title":
            console.error("✖ Title cannot be empty");
            break;

          case "type": {
            const types = commitTypes.join(", ");
            console.error(
              `✖ Invalid type; please specify one of [${types}]`
            );
            break;
          }

          case "type-case":
            console.error("✖ Type must be all lower case");
            break;
        }
      }
      console.log(
        "ℹ For more information about conventional commits, see https://www.conventionalcommits.org/"
      );
    }
  });
}

function test() {
  /**
   * @param {string[]} actual
   * @returns {{ toEqual: (expected: string[]) => void }}
   */
  function expect(actual) {
    return {
      toEqual: (expected) => {
        const result =
          expected.length === actual.length &&
          expected.reduce(
            (result, issue, index) => result && issue === actual[index],
            true
          );
        if (!result) {
          throw new Error(`Expected [${expected}]; got [${actual}]`);
        }
      },
    };
  }

  expect(lint("")).toEqual(["empty"]);
  expect(lint("fix")).toEqual(["format"]);
  expect(lint("foo:")).toEqual(["type", "title"]);
  expect(lint("Fix:")).toEqual(["type-case", "title"]);
  expect(lint("fix:")).toEqual(["title"]);
  expect(lint("fix: ")).toEqual(["title"]);
  expect(lint("fix():")).toEqual(["scope", "title"]);
  expect(lint("fix(): ")).toEqual(["scope", "title"]);
  expect(lint("fix(Scope): ")).toEqual(["scope-case", "title"]);
  expect(lint("fix:title")).toEqual(["space-after-colon"]);
  expect(lint("fix: title\nbody")).toEqual(["paragraph"]);
  expect(lint("fix():title\nbody")).toEqual([
    "scope",
    "space-after-colon",
    "paragraph",
  ]);

  expect(lint("fix: title\n\nbody")).toEqual([]);
  expect(lint("fix(scope): title\n\nbody")).toEqual([]);
  expect(lint("fix!: title\n\nbody")).toEqual([]);
  expect(lint("fix(scope)!: title\n\nbody")).toEqual([]);

  expect(
    lint(
      "fix: title\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo."
    )
  ).toEqual(["body-line-length"]);
  expect(
    lint(
      "fix: title\n\nLorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo"
    )
  ).toEqual([]);
}

const [, thisScript, arg] = process.argv;
if (arg === "test") {
  test();
} else if (thisScript === fileURLToPath(import.meta.url)) {
  main();
}
