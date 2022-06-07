#!/usr/bin/env node
// @ts-check

import { generateSchema } from "./generate-schema.mjs";

/**
 * @typedef {import("./generate-schema.mjs").Schema} Schema
 * @typedef {import("./generate-schema.mjs").SchemaDefinition} SchemaDefinition
 */

async function generateManifestDocs() {
  const schema = await generateSchema();

  /**
   * Renders the specified JSON object schema.
   * @param {Schema | SchemaDefinition} definition
   * @param {string[]} lines
   * @param {string} scope
   */
  const render = (definition, lines, scope = "") => {
    definition.allOf?.forEach(({ $ref }) => {
      render(schema.$defs[$ref.replace("#/$defs/", "")], lines, scope);
    });

    if (!definition.properties) {
      return;
    }

    const breadcrumb = (() => {
      let count = 0;
      const length = scope.length;
      for (let i = 0; i < length; ++i) {
        if (scope.charAt(i) === "/") {
          count++;
        }
      }
      return ".".repeat(count);
    })();

    for (const [key, def] of Object.entries(definition.properties)) {
      const { markdownDescription, type } = def;
      if (markdownDescription) {
        const anchor =
          breadcrumb.length < 2
            ? `<a name="${scope
                .split("/")
                .slice(1, 3)
                .concat([key])
                .join(".")}" />`
            : "";
        lines.push("<tr>");
        lines.push(`<td valign='baseline'>${anchor}${breadcrumb}${key}</td>`);
        lines.push(`<td>\n\n${markdownDescription}\n</td>`);
        lines.push("</tr>");
      }
      if (type === "object") {
        render(def, lines, scope + `/${key}`);
      }
    }
  };

  const lines = ["<table>"];
  render(schema, lines);
  lines.push("</table>");

  return lines.join("\n");
}

generateManifestDocs().then(console.log).catch(console.error);
