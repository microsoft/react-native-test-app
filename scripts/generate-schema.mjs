// @ts-check
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { isMain } from "./helpers.js";
import { generateSchema } from "./schema.mjs";

/** @typedef {import("./types").Docs} Docs */

/** @type {(str: string) => string} */
const stripCarriageReturn =
  os.EOL === "\r\n" ? (str) => str.replace(/\r/g, "") : (str) => str;

/**
 * @returns {Promise<Partial<Docs>>}
 */
export async function readDocumentation() {
  /** @type {Partial<Docs>} */
  const docs = {};
  const docsDir = fileURLToPath(new URL("docs", import.meta.url));

  /** @type {(keyof Docs)[]} */
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

  for (const name of keys) {
    const filename = path.join(docsDir, name + ".md");
    const md = await fs.readFile(filename, { encoding: "utf-8" });
    docs[name] = stripCarriageReturn(md).trim();
  }

  return docs;
}

if (isMain(import.meta.url)) {
  readDocumentation()
    .then((docs) => generateSchema(docs))
    .then((schema) => {
      for (const def of Object.values(schema.$defs)) {
        delete def["exclude-from-codegen"];
      }
      return stripCarriageReturn(JSON.stringify(schema, undefined, 2)) + "\n";
    })
    .then((schema) => fs.writeFile("schema.json", schema))
    .catch(console.error);
}
