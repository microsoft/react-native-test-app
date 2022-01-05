// @ts-check
"use strict";

describe("mergeConfig()", () => {
  const { mergeConfig } = require("../../scripts/configure");

  test("merges empty configs", () => {
    expect(
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
      )
    ).toEqual({
      scripts: {},
      dependencies: {},
      files: {},
      oldFiles: [],
    });
  });

  test("ignore empty config on rhs", () => {
    expect(
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
      )
    ).toEqual({
      scripts: {
        start: "react-native start",
      },
      dependencies: {},
      files: {
        "metro.config.js": "module.exports = {};",
      },
      oldFiles: ["ios/Example.xcodeproj"],
    });
  });

  test("overwrites lhs if rhs has the same entry", () => {
    expect(
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
      )
    ).toEqual({
      scripts: {
        start: "react-native custom start",
      },
      dependencies: {},
      files: {
        "babel.config.js": "module.exports = {};",
        "metro.config.js": "module.exports = {};",
      },
      oldFiles: ["ios/Example.xcodeproj", "ios/Example.xcodeproj"],
    });
  });
});
