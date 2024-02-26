// @ts-check
import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeConfig } from "../../scripts/configure.mjs";

describe("mergeConfig()", () => {
  it("merges empty configs", () => {
    deepEqual(
      mergeConfig(
        {
          scripts: {},
          dependencies: {},
          files: {},
          oldFiles: [],
        },
        {
          scripts: {},
          dependencies: {},
          files: {},
          oldFiles: [],
        }
      ),
      {
        scripts: {},
        dependencies: {},
        files: {},
        oldFiles: [],
      }
    );
  });

  it("ignore empty config on rhs", () => {
    deepEqual(
      mergeConfig(
        {
          scripts: {
            start: "react-native start",
          },
          dependencies: {},
          files: {
            "metro.config.js": "module.exports = {};",
          },
          oldFiles: ["ios/Example.xcodeproj"],
        },
        {
          scripts: {},
          dependencies: {},
          files: {},
          oldFiles: [],
        }
      ),
      {
        scripts: {
          start: "react-native start",
        },
        dependencies: {},
        files: {
          "metro.config.js": "module.exports = {};",
        },
        oldFiles: ["ios/Example.xcodeproj"],
      }
    );
  });

  it("overwrites lhs if rhs has the same entry", () => {
    deepEqual(
      mergeConfig(
        {
          scripts: {
            start: "react-native start",
          },
          dependencies: {},
          files: {
            "babel.config.js": "module.exports = {};",
          },
          oldFiles: ["ios/Example.xcodeproj"],
        },
        {
          scripts: {
            start: "react-native custom start",
          },
          dependencies: {},
          files: {
            "metro.config.js": "module.exports = {};",
          },
          oldFiles: ["ios/Example.xcodeproj"],
        }
      ),
      {
        scripts: {
          start: "react-native custom start",
        },
        dependencies: {},
        files: {
          "babel.config.js": "module.exports = {};",
          "metro.config.js": "module.exports = {};",
        },
        oldFiles: ["ios/Example.xcodeproj", "ios/Example.xcodeproj"],
      }
    );
  });
});
