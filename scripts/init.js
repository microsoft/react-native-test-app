#!/usr/bin/env node
// @ts-check
"use strict";

(async () => {
  const { version: targetVersion } = require("react-native/package.json");
  const { configure } = require("./configure");

  /**
   * @type {{
   *   name?: string;
   *   packagePath?: string;
   *   platforms?: import("./configure").Platform[];
   * }}
   */
  const { name, packagePath, platforms } = await require("prompts")([
    {
      type: "text",
      name: "name",
      message: "What is the name of your test app?",
      initial: "TestApp",
      validate: Boolean,
    },
    {
      type: "multiselect",
      name: "platforms",
      message: "Which platforms do you need test apps for?",
      choices: [
        { title: "Android", value: "android", selected: true },
        { title: "iOS", value: "ios", selected: true },
        { title: "macOS", value: "macos", selected: true },
        { title: "Windows", value: "windows", selected: true },
      ],
      min: 1,
    },
    {
      type: "text",
      name: "packagePath",
      message: "Where should we create the new project?",
      initial: "example",
      validate: Boolean,
    },
  ]);

  if (!name || !packagePath || !platforms) {
    process.exit(1);
  }

  const path = require("path");

  const result = configure({
    name,
    packagePath,
    testAppPath: path.resolve(__dirname, ".."),
    targetVersion,
    platforms,
    flatten: true,
    force: true,
    init: true,
  });
  if (result !== 0) {
    process.exit(result);
  }
})();
