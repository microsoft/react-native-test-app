// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { findFile, isMain } from "../helpers.js";
import { main } from "./main.mjs";

const INDENT = "    ";

/**
 * @param {string} message
 */
export function warn(message) {
  console.warn("app.json:", message);
}

/**
 * @param {number} i
 * @returns {string}
 */
function num(i) {
  const value = i.toString();
  return value.includes(".") ? value : "INT64_C(" + value + ")";
}

/**
 * @param {unknown} s
 * @returns {string}
 */
function str(s, literal = "") {
  return typeof s === "string" ? '"' + s + `"${literal}` : "std::nullopt";
}

/**
 * @param {unknown[]} items
 * @param {number} level
 * @returns {string}
 */
function array(items, level) {
  if (items.length === 0) {
    return "std::vector<std::any>{}";
  }

  const innerIndent = INDENT.repeat(level + 1);

  const lines = [];
  for (const value of items) {
    switch (typeof value) {
      case "boolean":
        lines.push(innerIndent + value.toString());
        break;
      case "number":
        lines.push(innerIndent + num(value));
        break;
      case "string":
        lines.push(innerIndent + str(value, "sv"));
        break;
      case "object":
        if (Array.isArray(value)) {
          lines.push(innerIndent + array(value, level + 1));
        } else if (value) {
          lines.push(innerIndent + object(value, level + 1));
        } else {
          lines.push(innerIndent + "nullptr");
        }
        break;
      default:
        warn(`Unexpected JSON type while parsing: ${value}`);
        break;
    }
  }
  return (
    "std::vector<std::any>{\n" +
    lines.join(",\n") +
    "\n" +
    INDENT.repeat(level) +
    "}"
  );
}

/**
 * @param {unknown} props
 * @param {number} level
 * @returns {string}
 */
function object(props, level) {
  if (typeof props !== "object" || !props) {
    return "std::nullopt";
  }

  const entries = Object.entries(props);
  if (entries.length === 0) {
    return "JSONObject{}";
  }

  const innerIndent = INDENT.repeat(level + 1);

  const lines = ["JSONObject{"];
  for (const [key, value] of entries) {
    switch (typeof value) {
      case "boolean":
        lines.push(`${innerIndent}{${str(key)}, ${value}},`);
        break;
      case "number":
        lines.push(`${innerIndent}{${str(key)}, ${num(value)}},`);
        break;
      case "string":
        lines.push(`${innerIndent}{${str(key)}, ${str(value, "sv")}},`);
        break;
      case "object":
        if (Array.isArray(value)) {
          lines.push(
            `${innerIndent}{`,
            `${innerIndent}${INDENT}${str(key)},`,
            `${innerIndent}${INDENT}${array(value, level + 2)}`,
            `${innerIndent}},`
          );
        } else if (value) {
          lines.push(
            `${innerIndent}{`,
            `${innerIndent}${INDENT}${str(key)},`,
            `${innerIndent}${INDENT}${object(value, level + 2)}`,
            `${innerIndent}},`
          );
        } else {
          lines.push(`${innerIndent}{${str(key)}, nullptr},`);
        }
        break;
      default:
        warn(`Unexpected JSON type while parsing '${key}': ${value}`);
        break;
    }
  }
  lines.push(INDENT.repeat(level) + "}");
  return lines.join("\n");
}

/**
 * @param {unknown} components
 * @param {number} level
 * @returns {string}
 */
function components(components, level) {
  if (!Array.isArray(components) || components.length === 0) {
    return "std::make_optional<std::vector<Component>>({})";
  }

  const outerIndent = INDENT.repeat(level + 1);
  const innerIndent = INDENT.repeat(level + 2);

  const lines = ["std::make_optional<std::vector<Component>>({"];
  for (const c of components) {
    lines.push(outerIndent + "Component{");
    lines.push(innerIndent + str(c.appKey) + ",");
    lines.push(innerIndent + str(c.displayName ?? c.appKey) + ",");
    lines.push(innerIndent + object(c.initialProperties, level + 2) + ",");
    lines.push(innerIndent + str(c.presentationStyle) + ",");
    lines.push(innerIndent + str(c.slug));
    lines.push(outerIndent + "},");
  }
  lines.push(INDENT.repeat(level) + "})");
  return lines.join("\n");
}

/**
 * @param {Record<string, unknown>} json
 * @param {string} checksum
 * @returns {string}
 */
export function generate(json, checksum, fs = nodefs) {
  const nodeModulesPath = findFile("node_modules", process.cwd(), fs);
  if (!nodeModulesPath) {
    console.error(
      "Failed to find 'node_modules' — make sure you've installed npm dependencies"
    );
    return "";
  }

  const code = [
    "// clang-format off",
    '#include "Manifest.h"',
    "",
    "#include <cstdint>",
    "",
    "using ReactApp::Component;",
    "using ReactApp::JSONObject;",
    "using ReactApp::Manifest;",
    "",
    "Manifest ReactApp::GetManifest()",
    "{",
    "    using namespace std::literals::string_view_literals;",
    "",
    "    return Manifest{",
    "        " + str(json.name) + ",",
    "        " + str(json.displayName ?? json.name) + ",",
    "        " + str(json.version) + ",",
    "        " + str(json.bundleRoot) + ",",
    "        " + str(json.singleApp) + ",",
    "        " + components(json.components, 2),
    "    };",
    "}",
    "",
    "std::string_view ReactApp::GetManifestChecksum()",
    "{",
    `    return "${checksum}";`,
    "}",
    "",
  ].join("\n");

  const dest = path.join(nodeModulesPath, ".generated", "Manifest.g.cpp");
  fs.promises
    .mkdir(path.dirname(dest), { recursive: true, mode: 0o755 })
    .then(() => fs.promises.writeFile(dest, code));
  return "app.json -> " + dest;
}

if (isMain(import.meta.url)) {
  process.exitCode = main(generate);
}
