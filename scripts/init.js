#!/usr/bin/env node
//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

(async () => {
  const { configure, getTargetReactNativeVersion } = require("./configure");
  const targetVersion = getTargetReactNativeVersion();

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
