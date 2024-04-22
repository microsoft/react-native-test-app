// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { findFile, isMain } from "../helpers.js";
import { main, warn } from "./main.mjs";

const INDENT = "    ";

/**
 * @param {unknown} s
 * @returns {string}
 */
function str(s) {
  return typeof s === "string" ? '"' + s + '"' : "nil";
}

/**
 * @param {unknown[]} items
 * @param {number} level
 * @returns {string}
 */
function array(items, level) {
  if (items.length === 0) {
    return "[]";
  }

  const innerIndent = INDENT.repeat(level + 1);

  const lines = [];
  for (const value of items) {
    switch (typeof value) {
      case "boolean":
      case "number":
        lines.push(innerIndent + value.toString());
        break;
      case "string":
        lines.push(innerIndent + str(value));
        break;
      case "object":
        if (Array.isArray(value)) {
          lines.push(innerIndent + array(value, level + 1));
        } else if (value) {
          lines.push(innerIndent + object(value, level + 1));
        } else {
          lines.push(innerIndent + "NSNull()");
        }
        break;
      default:
        warn(`Unexpected JSON type while parsing: ${value}`);
        break;
    }
  }
  lines.push(INDENT.repeat(level) + "]");
  return "[\n" + lines.join(",\n");
}

/**
 * @param {unknown} props
 * @param {number} level
 * @returns {string}
 */
function object(props, level) {
  if (typeof props !== "object" || !props) {
    return "nil";
  }

  const entries = Object.entries(props);
  if (entries.length === 0) {
    return "[:]";
  }

  const innerIndent = INDENT.repeat(level + 1);

  const lines = ["["];
  for (const [key, value] of entries) {
    switch (typeof value) {
      case "boolean":
      case "number":
        lines.push(`${innerIndent}${str(key)}: ${value},`);
        break;
      case "string":
        lines.push(`${innerIndent}${str(key)}: ${str(value)},`);
        break;
      case "object":
        if (Array.isArray(value)) {
          lines.push(`${innerIndent}${str(key)}: ${array(value, level + 1)},`);
        } else if (value) {
          lines.push(`${innerIndent}${str(key)}: ${object(value, level + 1)},`);
        } else {
          lines.push(`${innerIndent}${str(key)}: NSNull(),`);
        }
        break;
      default:
        warn(`Unexpected JSON type while parsing '${key}': ${value}`);
        break;
    }
  }
  lines.push(INDENT.repeat(level) + "]");
  return lines.join("\n");
}

/**
 * @param {unknown} components
 * @param {number} level
 * @returns {string}
 */
function components(components, level) {
  if (!Array.isArray(components) || components.length === 0) {
    return "[]";
  }

  const outerIndent = INDENT.repeat(level + 1);
  const innerIndent = INDENT.repeat(level + 2);

  const lines = ["["];
  for (const c of components) {
    lines.push(outerIndent + "Component(");
    lines.push(`${innerIndent}appKey: ${str(c.appKey)},`);
    lines.push(`${innerIndent}displayName: ${str(c.displayName ?? c.appKey)},`);
    lines.push(
      `${innerIndent}initialProperties: ${object(c.initialProperties, level + 2)},`
    );
    lines.push(`${innerIndent}presentationStyle: ${str(c.presentationStyle)},`);
    lines.push(`${innerIndent}slug: ${str(c.slug)}`);
    lines.push(outerIndent + "),");
  }
  lines.push(INDENT.repeat(level) + "]");
  return lines.join("\n");
}

/**
 * @param {Record<string, unknown>} json
 * @param {string} checksum
 * @returns {string}
 */
export function generate(json, checksum, fs = nodefs) {
  const srcRoot = process.env["SRCROOT"] || process.cwd();
  const nodeModulesPath = findFile("node_modules", srcRoot, fs);
  if (!nodeModulesPath) {
    console.error(
      "Failed to find 'node_modules' — make sure you've installed npm dependencies"
    );
    return "";
  }

  const code = [
    "import Foundation",
    "",
    "extension Manifest {",
    "    static func checksum() -> String {",
    `        "${checksum}"`,
    "    }",
    "",
    "    static func load() -> Self {",
    "        Manifest(",
    "            name: " + str(json.name) + ",",
    "            displayName: " + str(json.displayName ?? json.name) + ",",
    "            version: " + str(json.version) + ",",
    "            bundleRoot: " + str(json.bundleRoot) + ",",
    "            singleApp: " + str(json.singleApp) + ",",
    "            components: " + components(json.components, 3),
    "        )",
    "    }",
    "}",
    "",
  ].join("\n");

  const dest = path.join(
    nodeModulesPath,
    ".generated",
    path.basename(srcRoot),
    "Manifest+Embedded.g.swift"
  );
  fs.promises
    .mkdir(path.dirname(dest), { recursive: true, mode: 0o755 })
    .then(() => fs.promises.writeFile(dest, code));
  return "app.json -> " + dest;
}

if (!process.argv[1] || isMain(import.meta.url)) {
  process.exitCode = main(generate);
}
