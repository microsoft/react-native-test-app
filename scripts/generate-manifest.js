#!/usr/bin/env node
// @ts-check
"use strict";

const path = require("path");

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
 * @typedef {{
 *   type: "array";
 *   items: { "$ref": string; };
 * }} SchemaArrayProperty
 *
 * @typedef {{
 *   type: "string";
 *   enum?: string[];
 * }} SchemaStringProperty
 *
 * @typedef {{
 *   type: "object";
 *   properties: Record<string, SchemaArrayProperty | SchemaObjectProperty | SchemaStringProperty>;
 *   required?: string[];
 * }} SchemaObjectProperty
 */
const schema = require("../schema.json");

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
 * @param {SchemaObjectProperty} definition
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
 * @param {string} output
 */
async function generate(output) {
  const lang = getLanguage(output);
  const lines = [
    `// This file was generated by ${path.basename(__filename)}.`,
    "// DO NOT MODIFY. ALL CHANGES WILL BE OVERWRITTEN.",
    "",
  ];

  if (lang.options.header) {
    lines.push(lang.options.header);
  }

  Object.entries(schema.$defs).forEach(([key, definition]) => {
    lines.push(
      ...generateType(
        typename(key),
        /** @type {SchemaObjectProperty} */ (definition),
        lang
      ),
      ""
    );
    return lines;
  });

  if (lang.options.footer) {
    lines.push(lang.options.footer);
  }

  const code = lines.join("\n");

  const fs = require("fs/promises");
  const content = await fs.readFile(output, { encoding: "utf-8" });
  if (content !== code) {
    fs.writeFile(output, code);
  }
}

[
  path.join(
    __dirname,
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
  path.join(__dirname, "..", "ios", "ReactTestApp", "Manifest.swift"),
  path.join(__dirname, "..", "windows", "ReactTestApp", "Manifest.h"),
].forEach((output) => generate(output));
