#!/usr/bin/env node
// @ts-check
"use strict";

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSchema } from "./generate-schema.mjs";

/**
 * @typedef {{
 *   options: {
 *     indent: string;
 *     level: number;
 *     footer?: string;
 *     header?: string;
 *   };
 *   arrayProperty: (name: string, type: string, required: boolean) => string;
 *   objectProperty: (name: string, required: boolean) => string;
 *   stringProperty: (name: string, required: boolean) => string;
 *   structBegin: (name: string) => string;
 *   structEnd: string;
 * }} Language
 *
 * @typedef {import("./generate-schema.mjs").Schema} Schema
 * @typedef {import("./generate-schema.mjs").SchemaDefinition} SchemaDefinition
 */
const thisScript = fileURLToPath(import.meta.url);

/**
 * Returns the struct name of the definition key or reference.
 * @param {string} ref
 * @returns {string}
 */
function typename(ref) {
  const i = ref.lastIndexOf("/") + 1;
  return ref[i].toUpperCase() + ref.substring(i + 1);
}

/**
 * Returns the language implementation for the specified output file.
 * @param {string} output
 * @returns {Language}
 */
function getLanguage(output) {
  switch (path.extname(output)) {
    case ".h": {
      /** @type {(type: string, required: boolean) => string} */
      const nullable = (type, required) =>
        required ? type : `std::optional<${type}>`;
      return {
        options: {
          indent: "    ",
          level: 1,
          header: [
            "#ifndef REACTTESTAPP_MANIFEST_H_",
            "#define REACTTESTAPP_MANIFEST_H_",
            "",
            "#include <any>",
            "#include <map>",
            "#include <optional>",
            "#include <string>",
            "#include <tuple>",
            "#include <vector>",
            "",
            "namespace ReactTestApp",
            "{",
          ].join("\n"),
          footer: [
            "    std::optional<std::tuple<Manifest, std::string>> GetManifest(std::string const &filename);",
            "",
            "}  // namespace ReactTestApp",
            "",
            "#endif  // REACTTESTAPP_MANIFEST_H_",
            "",
          ].join("\n"),
        },
        arrayProperty: (name, type, required) => {
          const propType = `std::vector<${typename(type)}>`;
          return `${nullable(propType, required)} ${name};`;
        },
        objectProperty: (name, required) => {
          const propType = `std::map<std::string, std::any>`;
          return `${nullable(propType, required)} ${name};`;
        },
        stringProperty: (name, required) => {
          return `${nullable("std::string", required)} ${name};`;
        },
        structBegin: (name) => `struct ${typename(name)} {`,
        structEnd: `};`,
      };
    }

    case ".kt": {
      /** @type {(required: boolean) => "" | "?"} */
      const nullable = (required) => (required ? "" : "?");
      return {
        options: {
          indent: "    ",
          level: 0,
          header: [
            "package com.microsoft.reacttestapp.manifest",
            "",
            "import android.os.Bundle",
            "import com.squareup.moshi.JsonClass",
            "",
            "/* ktlint-disable trailing-comma */",
            "",
          ].join("\n"),
        },
        arrayProperty: (name, type, required) => {
          return `val ${name}: List<${typename(type)}>${nullable(required)},`;
        },
        objectProperty: (name, required) => {
          return `val ${name}: Bundle${nullable(required)},`;
        },
        stringProperty: (name, required) => {
          return `val ${name}: String${nullable(required)},`;
        },
        structBegin: (name) =>
          `@JsonClass(generateAdapter = true)\ndata class ${typename(name)}(`,
        structEnd: `)`,
      };
    }

    case ".swift": {
      /** @type {(required: boolean) => "" | "?"} */
      const nullable = (required) => (required ? "" : "?");
      return {
        options: {
          indent: "    ",
          level: 0,
        },
        arrayProperty: (name, type, required) => {
          return `let ${name}: [${typename(type)}]${nullable(required)}`;
        },
        objectProperty: (name, required) => {
          return `let ${name}: [AnyHashable: Any]${nullable(required)}`;
        },
        stringProperty: (name, required) => {
          return `let ${name}: String${nullable(required)}`;
        },
        structBegin: (name) => `struct ${typename(name)}: Decodable {`,
        structEnd: `}`,
      };
    }

    default:
      throw new Error(`Unsupported file type: ${output}`);
  }
}

/**
 * Generates a data model from the specified schema definition.
 * @param {string} name
 * @param {SchemaDefinition} definition
 * @param {Language} lang
 * @returns {string[]}
 */
function generateType(name, definition, lang) {
  const { indent, level } = lang.options;
  const outer = indent.repeat(level);
  const inner = indent.repeat(level + 1);

  const result = [outer + lang.structBegin(name)];

  const { properties, required = [] } = definition;
  Object.entries(properties).forEach(([name, prop]) => {
    const isRequired = required.includes(name);
    switch (prop.type) {
      case "array":
        result.push(
          inner + lang.arrayProperty(name, prop.items.$ref, isRequired)
        );
        break;
      case "object":
        result.push(inner + lang.objectProperty(name, isRequired));
        break;
      case "string":
        result.push(inner + lang.stringProperty(name, isRequired));
        break;
    }
  });

  result.push(outer + lang.structEnd);
  return result;
}

/**
 * Generates manifest data models and writes them to specified path.
 * @param {Schema} schema
 * @param {string} output
 */
async function generate(schema, output) {
  const lang = getLanguage(output);
  const lines = [
    `// This file was generated by ${path.basename(thisScript)}.`,
    "// DO NOT MODIFY. ALL CHANGES WILL BE OVERWRITTEN.",
    "",
  ];

  if (lang.options.header) {
    lines.push(lang.options.header);
  }

  Object.entries(schema.$defs).forEach(([key, definition]) => {
    if (!("exclude-from-codegen" in definition)) {
      lines.push(
        ...generateType(
          typename(key),
          /** @type {SchemaDefinition} */ (definition),
          lang
        ),
        ""
      );
    }
    return lines;
  });

  if (lang.options.footer) {
    lines.push(lang.options.footer);
  }

  const code = lines.join("\n");

  const content = await fs.readFile(output, { encoding: "utf-8" });
  if (content !== code) {
    fs.writeFile(output, code);
  }
}

async function main() {
  const schema = await generateSchema();
  const scriptsDir = path.dirname(thisScript);

  [
    path.join(
      scriptsDir,
      "..",
      "android",
      "app",
      "src",
      "main",
      "java",
      "com",
      "microsoft",
      "reacttestapp",
      "manifest",
      "Manifest.kt"
    ),
    path.join(scriptsDir, "..", "ios", "ReactTestApp", "Manifest.swift"),
    path.join(scriptsDir, "..", "windows", "ReactTestApp", "Manifest.h"),
  ].forEach((output) => generate(schema, output));
}

main().catch(console.error);
