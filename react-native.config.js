//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

/**
 * @template ConfigT
 * @typedef {{
 *   name: string,
 *   description?: string,
 *   func: (argv: Array<string>, config: ConfigT, args: {}) => ?Promise<void>,
 *   options?: Array<{
 *     name: string,
 *     description?: string,
 *     parse?: (val: string) => any,
 *     default?:
 *       | string
 *       | boolean
 *       | number
 *       | ((config: ConfigT) => string | boolean | number),
 *   }>,
 *   examples?: Array<{
 *     desc: string,
 *     cmd: string,
 *   }>,
 * }} Command;
 */

/**
 * Infers project name by finding and parsing the nearest `package.json`.
 * @returns {string | undefined}
 */
function inferProjectName() {
  const { findNearest } = require("./windows/test-app");
  const packageJson = findNearest("package.json");
  if (packageJson) {
    const fs = require("fs");
    try {
      const fileContent = fs.readFileSync(packageJson, { encoding: "utf8" });
      const name = JSON.parse(fileContent)["name"];
      return typeof name === "string" && name ? `${name}-test-app` : undefined;
    } catch (_) {
      // Ignore
    }
  }

  return undefined;
}

/** @type {{ commands: Command<{}>[] }} */
module.exports = {
  commands: [
    {
      name: "init-test-app",
      description: "Initializes a new test app project",
      func: (_, __, args) => {
        const path = require("path");
        const plop = require("node-plop");
        // @ts-ignore tsc doesn't think that "node-plop" returns a function
        plop(path.join(__dirname, "plopfile.js"), {
          destBasePath: args["destination"],
        })
          .getGenerator("app")
          .runActions(args);
      },
      options: [
        {
          name: "--destination [string]",
          description:
            "Path to the directory where the test app should be created",
          default: process.cwd(),
        },
        {
          name: "--name [string]",
          description: "Display name of the test app",
          default: inferProjectName() || "ReactTestApp",
        },
        {
          name: "--platform [string]",
          description:
            "Specific platform to support: all, android, ios, macos, windows",
          default: "all",
        },
      ],
    },
  ],
};
