#!/usr/bin/env node
// @ts-check

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSchema } from "./schema.js";

const thisScript = fileURLToPath(import.meta.url);
const docsDir = path.join(path.dirname(thisScript), "docs");

/**
 * @returns {Promise<import("./schema.js").Docs>}
 */
export async function readDocumentation() {
  /** @type {(keyof import("./schema.js").Docs)[]} */
  const keys = [
    "introduction",
    "bundleRoot",
    "components",
    "resources",
    "singleApp",
    "version",
    "android.icons",
    "android.signingConfigs",
    "android.versionCode",
    "ios.buildNumber",
    "ios.codeSignEntitlements",
    "ios.codeSignIdentity",
    "ios.developmentTeam",
    "ios.icons",
    "ios.icons.primaryIcon",
    "ios.icons.alternateIcons",
    "macos.applicationCategoryType",
    "macos.humanReadableCopyright",
    "windows.appxManifest",
    "windows.certificateKeyFile",
    "windows.certificatePassword",
    "windows.certificateThumbprint",
  ];

  const docs = /** @type {import("./schema.js").Docs} */ ({});

  for (const name of keys) {
    const filename = path.join(docsDir, name + ".md");
    const md = await fs.readFile(filename, { encoding: "utf-8" });
    docs[name] = trimCarriageReturn(md).trim();
  }

  return docs;
}

/** @type {(s: string) => string} */
const trimCarriageReturn =
  os.EOL === "\r\n" ? (str) => str.replace(/\r/g, "") : (str) => str;

if (process.argv[1] === thisScript) {
  readDocumentation()
    .then((docs) => generateSchema(docs))
    .then((schema) => {
      for (const def of Object.values(schema.$defs)) {
        delete def["exclude-from-codegen"];
      }
      return trimCarriageReturn(JSON.stringify(schema, undefined, 2)) + "\n";
    })
    .then((schema) => fs.writeFile("schema.json", schema))
    .catch(console.error);
}
