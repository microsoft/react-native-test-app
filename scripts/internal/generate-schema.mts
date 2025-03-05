// eslint-disable-next-line no-restricted-imports
import type { SchemaObject } from "ajv";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { URL, fileURLToPath } from "node:url";
import { isMain } from "../helpers.js";
import { generateSchema } from "../schema.mjs";
import type { Docs } from "../types.js";

type Definition = SchemaObject & {
  type: string;
  description: string;
  markdownDescription?: string;
};

const stripCarriageReturn: (str: string) => string =
  os.EOL === "\r\n" ? (str) => str.replaceAll("\r", "") : (str) => str;

export function assertDefinition(props: unknown): asserts props is Definition {
  if (
    !props ||
    typeof props !== "object" ||
    !("type" in props || "allOf" in props || "oneOf" in props)
  ) {
    throw new Error(`Invalid definition in schema: ${JSON.stringify(props)}`);
  }
}

export async function readDocumentation(): Promise<Partial<Docs>> {
  const docs: Partial<Docs> = {};
  const docsDir = fileURLToPath(new URL("../../docs", import.meta.url));

  const keys: (keyof Docs)[] = [
    "introduction",
    "bundleRoot",
    "components",
    "resources",
    "singleApp",
    "version",
    "android.features",
    "android.icons",
    "android.package",
    "android.permissions",
    "android.metaData",
    "android.signingConfigs",
    "android.versionCode",
    "ios.buildNumber",
    "ios.bundleIdentifier",
    "ios.codeSignEntitlements",
    "ios.codeSignIdentity",
    "ios.developmentTeam",
    "ios.icons",
    "ios.icons.primaryIcon",
    "ios.icons.alternateIcons",
    "ios.metalAPIValidation",
    "ios.privacyManifest",
    "macos.applicationCategoryType",
    "macos.humanReadableCopyright",
    "windows.appxManifest",
    "windows.certificateKeyFile",
    "windows.certificatePassword",
    "windows.certificateThumbprint",
  ];

  const fileReadOptions = { encoding: "utf-8" } as const;

  await Promise.all(
    keys.map(async (name) => {
      const filename = path.join(docsDir, name + ".md");
      const md = await fs.readFile(filename, fileReadOptions);
      docs[name] = stripCarriageReturn(md).trim();
    })
  );

  return docs;
}

if (isMain(import.meta.url)) {
  readDocumentation()
    .then((docs) => generateSchema(docs))
    .then((schema) => {
      for (const def of Object.values(schema.$defs)) {
        assertDefinition(def);
        delete def["exclude-from-codegen"];
      }
      return stripCarriageReturn(JSON.stringify(schema, undefined, 2)) + "\n";
    })
    .then((schema) => fs.writeFile("schema.json", schema))
    .catch(console.error);
}
