#!/usr/bin/env node
// @ts-check

import { readFileSync } from "fs";

/**
 * @typedef {{
 *   markdownDescription?: string;
 *   type: "array";
 *   items: { $ref: string; };
 * }} SchemaArrayProperty
 *
 * @typedef {{
 *   markdownDescription?: string;
 *   type: "string";
 *   enum?: string[];
 * }} SchemaStringProperty
 *
 * @typedef {{
 *   markdownDescription?: string;
 *   allOf?: { $ref: string; }[];
 *   type: "object";
 *   properties: Record<string, SchemaArrayProperty | SchemaObjectProperty | SchemaStringProperty>;
 * }} SchemaObjectProperty
 */
const schema = (() => {
  const content = readFileSync("schema.json", { encoding: "utf-8" });
  return JSON.parse(content);
})();

/**
 * Renders the specified JSON object schema.
 * @param {SchemaObjectProperty} definition
 * @param {string[]} lines
 * @param {string} scope
 */
function render(definition, lines, scope = "") {
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
}

const lines = ["<table>"];
render(schema, lines);
lines.push("</table>");

console.log(lines.join("\n"));
