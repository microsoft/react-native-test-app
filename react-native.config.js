//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

/**
 * @template Args
 * @typedef {{
 *   name: string,
 *   description?: string,
 *   examples?: Array<{
 *     desc: string;
 *     cmd: string;
 *   }>,
 *   func: (argv: Array<string>, config: {}, args: Args) => void | Promise<void>,
 *   options?: Array<{
 *     name: string;
 *     description?: string;
 *     parse?: (val: string) => any;
 *     default?: string | number | boolean;
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

/**
 * @param {string} choice
 * @returns {import("./scripts/configure").Platform[]}
 */
function sanitizePlatformChoice(choice) {
  switch (choice) {
    case "all":
      return ["android", "ios", "macos", "windows"];
    case "android":
    case "ios":
    case "macos":
    case "windows":
      return [choice];
    default:
      throw new Error(`Unknown platform: ${choice}`);
  }
}

/** @type {{ commands: Command<{ destination: string; name: string; platform: string; }>[] }} */
module.exports = {
  commands: [
    {
      name: "init-test-app",
      description: "Initializes a new test app project",
      func: (_argv, _config, { destination, name, platform }) => {
        const {
          configure,
          getTargetReactNativeVersion,
        } = require("./scripts/configure");
        configure({
          name,
          packagePath: destination,
          testAppPath: __dirname,
          targetVersion: getTargetReactNativeVersion(),
          platforms: sanitizePlatformChoice(platform),
          flatten: true,
          force: true,
          init: true,
        });
      },
      options: [
        {
          name: "--destination [string]",
          description:
            "Path to the directory where the test app should be created",
          default: require("path").join(process.cwd(), "test-app"),
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
  dependency: {
    platforms: {
      windows: null,
    },
  },
};
