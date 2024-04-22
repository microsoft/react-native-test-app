// @ts-check
import { isMain } from "../helpers.js";
import { main } from "./main.mjs";

const INDENT = "    ";

/**
 * @param {string} message
 */
export function warn(message) {
  console.warn("//", message);
}

/**
 * @param {unknown} s
 * @returns {string}
 */
function str(s) {
  return typeof s === "string" ? '"' + s + '"' : "null";
}

/**
 * @param {unknown[]} items
 * @param {number} level
 * @returns {string}
 */
function array(items, level) {
  if (items.length === 0) {
    return "arrayListOf<Any>()";
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
          lines.push(innerIndent + bundle(value, level + 1));
        } else {
          lines.push(innerIndent + "null");
        }
        break;
      default:
        warn(`Unexpected JSON type while parsing: ${value}`);
        break;
    }
  }
  return (
    "arrayListOf(\n" + lines.join(",\n") + "\n" + INDENT.repeat(level) + ")"
  );
}

/**
 * @param {unknown} props
 * @param {number} level
 * @returns {string}
 */
function bundle(props, level) {
  if (typeof props !== "object" || !props) {
    return "null";
  }

  const entries = Object.entries(props);
  if (entries.length === 0) {
    return "Bundle()";
  }

  const innerIndent = INDENT.repeat(level + 1);

  const lines = ["Bundle().apply {"];
  for (const [key, value] of entries) {
    switch (typeof value) {
      case "boolean":
        lines.push(`${innerIndent}putBoolean(${str(key)}, ${value})`);
        break;
      case "number":
        lines.push(
          value.toString().includes(".")
            ? `${innerIndent}putDouble(${str(key)}, ${value})`
            : `${innerIndent}putInt(${str(key)}, ${value})`
        );
        break;
      case "string":
        lines.push(`${innerIndent}putString(${str(key)}, ${str(value)})`);
        break;
      case "object":
        if (Array.isArray(value)) {
          lines.push(
            `${innerIndent}putSerializable(`,
            `${innerIndent}${INDENT}${str(key)},`,
            `${innerIndent}${INDENT}${array(value, level + 2)}`,
            `${innerIndent})`
          );
        } else if (value) {
          lines.push(
            `${innerIndent}putBundle(`,
            `${innerIndent}${INDENT}${str(key)},`,
            `${innerIndent}${INDENT}${bundle(value, level + 2)}`,
            `${innerIndent})`
          );
        } else {
          lines.push(`${innerIndent}putString(${str(key)}, null)`);
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
    return "arrayListOf<Any>()";
  }

  const outerIndent = INDENT.repeat(level + 1);
  const innerIndent = INDENT.repeat(level + 2);

  const lines = ["arrayListOf("];
  for (const c of components) {
    lines.push(outerIndent + "Component(");
    lines.push(innerIndent + str(c.appKey) + ",");
    lines.push(innerIndent + str(c.displayName ?? c.appKey) + ",");
    lines.push(innerIndent + bundle(c.initialProperties, level + 2) + ",");
    lines.push(innerIndent + str(c.presentationStyle) + ",");
    lines.push(innerIndent + str(c.slug));
    lines.push(outerIndent + "),");
  }
  lines.push(INDENT.repeat(level) + ")");
  return lines.join("\n");
}

/**
 * @param {Record<string, unknown>} json
 * @param {string} checksum
 * @returns {string}
 */
export function generate(json, checksum) {
  return [
    "package com.microsoft.reacttestapp.manifest",
    "",
    "import android.os.Bundle",
    "",
    "class ManifestProvider {",
    "    companion object {",
    "        fun checksum(): String {",
    `            return "${checksum}"`,
    "        }",
    "",
    "        fun manifest(): Manifest {",
    "            return Manifest(",
    "                " + str(json.name) + ",",
    "                " + str(json.displayName ?? json.name) + ",",
    "                " + str(json.version) + ",",
    "                " + str(json.bundleRoot) + ",",
    "                " + str(json.singleApp) + ",",
    "                " + components(json.components, 4),
    "            )",
    "        }",
    "    }",
    "}",
    "",
  ].join("\n");
}

if (isMain(import.meta.url)) {
  process.exitCode = main(generate);
}
