// @ts-check
"use strict";

/**
 * @typedef {{
 *    description: string;
 *    type: "string" | "boolean";
 *    multiple?: boolean;
 *    short?: string;
 *    default?: string | boolean | string[];
 * }} Option;
 *
 * @typedef {{ [key: string]: Option }} Options;
 */
/**
 * @template {Option} O
 * @typedef {O extends { type: "boolean" }
 *             ? boolean
 *             : O extends { type: "string", multiple: true }
 *               ? string[]
 *               : string
 * } InferredOptionType<O>;
 */
/**
 * @template {Options} O
 * @typedef {{ [key in keyof O]: InferredOptionType<O[key]> }} InferredOptionTypes<O>;
 */
/**
 * @template {Options} O
 * @typedef {InferredOptionTypes<O> & { _: string[] }} Args;
 */
/**
 * @typedef {{
 *   string: string[];
 *   boolean: string[];
 *   alias: Record<string, string>;
 *   default: Record<string, string | boolean | string[]>;
 * }} MinimistOptions;
 */

/**
 * Generates help message.
 * @param {string} description
 * @param {Record<string, { short?: string; description: string; }>} options
 * @returns {string}
 */
function formatHelp(description, options) {
  const flags = Object.entries(options);
  const indent = "  ";
  const minWidth =
    Math.max(...flags.map(([flag]) => flag.length)) + indent.length * 2;

  const ui = require("cliui")();
  for (const [flag, config] of flags) {
    ui.div(
      { text: "", width: 2 },
      { text: config.short ? `-${config.short},` : "", width: 4 },
      { text: `--${flag}`, width: minWidth + 2 },
      { text: config.description }
    );
  }

  const script = require("path").basename(process.argv[1]);
  return [
    `usage: ${script} [options]`,
    "",
    description,
    "",
    "Options:",
    ui.toString(),
    "",
  ].join("\n");
}

/**
 * Converts options to the format required by minimist.
 * @param {Options} options
 * @returns {MinimistOptions}
 */
function minimistOptions(options) {
  /** @type {MinimistOptions} */
  const minimist = {
    string: [],
    boolean: [],
    alias: {},
    default: {},
  };

  for (const [flag, option] of Object.entries(options)) {
    if (option.type === "boolean") {
      minimist.boolean.push(flag);
    } else {
      minimist.string.push(flag);
    }

    if (option.short) {
      minimist.alias[option.short] = flag;
    }

    if (option.default) {
      minimist.default[flag] = option.default;
    }
  }

  return minimist;
}

/**
 * Parses command line arguments.
 *
 * Note: In the future, we can replace minimist with `util.parseArgs`.
 *
 * @see {@link https://nodejs.org/api/util.html#utilparseargsconfig}
 *
 * @template {Options} O
 * @param {string} description
 * @param {O} options
 * @param {(args: Args<O>) => void} callback
 */
function parseArgs(description, options, callback) {
  const mergedOptions = {
    help: {
      description: "Show this help message",
      type: "boolean",
      short: "h",
      default: false,
    },
    version: {
      description: "Show version number",
      type: "boolean",
      short: "v",
      default: false,
    },
    ...options,
  };

  const args = require("minimist")(
    process.argv.slice(2),
    minimistOptions(options)
  );

  if (args["help"]) {
    console.log(formatHelp(description, mergedOptions));
  } else if (args["version"]) {
    const { name, version } = require("../package.json");
    console.log(`${name} ${version}`);
  } else {
    callback(/** @type {Args<O>} */ (args));
  }
}

exports.parseArgs = parseArgs;
