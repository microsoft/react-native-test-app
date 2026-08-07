// @ts-check
import * as path from "node:path";
import * as util from "node:util";
import manifest from "../../package.json" with { type: "json" };

/** @import { Args, Options } from "../types.ts"; */

/**
 * @template {Options} O
 * @param {NonNullable<unknown>} values
 * @param {O} _options (Unused; only present for type inference)
 * @returns {values is Args<O>}
 */
function coerce(values, _options) {
  return typeof values === "object" && Object.hasOwn(values, "help");
}

/**
 * Wraps plain text at the specified width.
 * @note Words longer than specified width are not broken up and may overflow.
 * @param {string} text
 * @param {number} columns
 * @returns {string[]}
 */
export function wordWrap(text, columns) {
  const lines = [];

  const length = text.length;
  let lineStart = 0;
  let wordEnd = 0;

  for (let i = 0; i < length; ++i) {
    if (wordEnd > lineStart && i - lineStart > columns) {
      lines.push(text.slice(lineStart, wordEnd));
      lineStart = wordEnd + 1;
      wordEnd = lineStart;
    } else if (text[i] === " ") {
      wordEnd = i;
    }
  }

  lines.push(text.slice(lineStart, length));
  return lines;
}

/**
 * Formats options for help message.
 * @param {Record<string, { short?: string; description: string; }>} options
 * @param {number} columns
 * @returns {string}
 */
export function formatOptionsTable(options, columns) {
  /** @type {string[]} */
  const lines = [];

  const flags = Object.entries(options);
  const indent = "  ";
  const minFlagLength = Math.max(...flags.map(([flag]) => flag.length));
  // ␣␣-f,␣--flag␣␣␣␣description/usage of flag
  // ⇤── minCols  ──⇥⇤─── descriptionCols ───⇥
  const minCols = 8 + minFlagLength + indent.length * 2;
  const descriptionCols = columns - minCols;

  for (const [flag, config] of flags) {
    const short = config.short ? `-${config.short}, ` : "    ";
    const [first, ...rest] = wordWrap(config.description, descriptionCols);
    lines.push(
      `${indent}${short}--${flag.padEnd(minFlagLength)}${indent}${indent}${first}`,
      ...rest.map((line) => line.padStart(minCols + line.length))
    );
  }

  return lines.join("\n");
}

/**
 * Generates help message.
 * @param {string} description
 * @param {Record<string, { short?: string; description: string; }>} options
 * @returns {string}
 */
function formatHelp(description, options) {
  const script = path.basename(process.argv[1]);
  return [
    `usage: ${script} [options]`,
    "",
    description,
    "",
    "Options:",
    formatOptionsTable(options, process.stdout.columns ?? 80),
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
    const { name, version } = manifest;
    console.log(`${name} ${version}`);
  } else {
    values._ = positionals;
    callback(values);
  }
}
