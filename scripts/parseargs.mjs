// @ts-check
import cliui from "cliui";
import * as path from "node:path";
import * as util from "node:util";

/**
 * @typedef {import("./types").Options} Options;
 */
/**
 * @template {Options} O
 * @typedef {import("./types").Args<O>} Args;
 */

/**
 * @template {Options} O
 * @param {NonNullable<unknown>} values
 * @param {O} _options (Unused; only present for type inference)
 * @returns {values is Args<O>}
 */
function coerce(values, _options) {
  return Boolean(typeof values === "object" && "help" in values);
}

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
  const padding = [0, 0, 0, 0];

  const ui = cliui({ width: process.stdout.columns ?? 80 });
  for (const [flag, config] of flags) {
    ui.div(
      { text: "", width: 2, padding },
      { text: config.short ? `-${config.short},` : "", width: 4, padding },
      { text: `--${flag}`, width: minWidth + 2, padding },
      { text: config.description, padding }
    );
  }

  const script = path.basename(process.argv[1]);
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
 * Parses command line arguments.
 *
 * @see {@link https://nodejs.org/api/util.html#utilparseargsconfig}
 *
 * @template {Options} O
 * @param {string} description
 * @param {O} options
 * @param {(args: Args<O>) => void} callback
 */
export function parseArgs(description, options, callback) {
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

  const { values, positionals } = util.parseArgs({
    args: process.argv.slice(2),
    options: mergedOptions,
    strict: true,
    allowPositionals: true,
    tokens: false,
  });

  if (!coerce(values, mergedOptions)) {
    throw new Error("Failed to parse command-line arguments");
  }

  if (values.help) {
    console.log(formatHelp(description, mergedOptions));
  } else if (typeof values.version === "boolean" && values.version) {
    const { name, version } = require("../package.json");
    console.log(`${name} ${version}`);
  } else {
    values._ = positionals;
    callback(values);
  }
}
