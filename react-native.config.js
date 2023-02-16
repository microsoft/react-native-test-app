// @ts-check
"use strict";

const {
  findNearest,
  getPackageVersion,
  readJSONFile,
} = require("./scripts/helpers");

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
  const packageJson = findNearest("package.json");
  if (packageJson) {
    try {
      const name = readJSONFile(packageJson)["name"];
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
  const platforms = choice.split(",");
  for (const platform of choice.split(",")) {
    switch (platform) {
      case "all":
        return ["android", "ios", "macos", "windows"];
      case "android":
      case "ios":
      case "macos":
      case "windows":
        continue;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }
  return platforms;
}

/** @type {{ commands: Command<{ destination: string; name: string; platform: string; }>[] }} */
module.exports = {
  commands: [
    {
      name: "init-test-app",
      description: "Initializes a new test app project",
      func: (_argv, _config, { destination, name, platform }) => {
        const { configure } = require("./scripts/configure");
        configure({
          name,
          packagePath: destination,
          testAppPath: __dirname,
          targetVersion: getPackageVersion("react-native"),
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
