#!/usr/bin/env node
// @ts-check

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {Awaited<ReturnType<typeof generateSchema>>} Schema
 * @typedef {Schema["$defs"][keyof Schema["$defs"]]} SchemaDefinition
 */

const thisScript = fileURLToPath(import.meta.url);
const docsDir = path.join(path.dirname(thisScript), "docs");

/**
 * @param {string} content
 * @returns {string}
 */
function extractBrief(content) {
  const endBrief = content.indexOf("\n\n");
  return endBrief > 0 ? content.substring(0, endBrief) : content;
}

/**
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function readMarkdown(name) {
  const filename = path.join(docsDir, name + ".md");
  const md = await fs.readFile(filename, { encoding: "utf-8" });
  return trimCarriageReturn(md).trim();
}

/** @type {(s: string) => string} */
const trimCarriageReturn =
  os.EOL === "\r\n" ? (str) => str.replace(/\r/g, "") : (str) => str;

export async function generateSchema() {
  const dummy = Promise.resolve("");
  const docs = {
    bundleRoot: dummy,
    components: dummy,
    resources: dummy,
    singleApp: dummy,
    version: dummy,
    "android.icons": dummy,
    "android.signingConfigs": dummy,
    "android.versionCode": dummy,
    "ios.buildNumber": dummy,
    "ios.codeSignEntitlements": dummy,
    "ios.codeSignIdentity": dummy,
    "ios.developmentTeam": dummy,
    "ios.icons": dummy,
    "ios.icons.primaryIcon": dummy,
    "ios.icons.alternateIcons": dummy,
    "windows.appxManifest": dummy,
    "windows.certificateKeyFile": dummy,
    "windows.certificatePassword": dummy,
    "windows.certificateThumbprint": dummy,
  };
  for (const key of /** @type {(keyof typeof docs)[]} */ (Object.keys(docs))) {
    docs[key] = readMarkdown(key);
  }

  return {
    $defs: {
      appIconSet: {
        type: "object",
        properties: {
          filename: {
            description: "Path to the app icon file.",
            type: "string",
          },
          prerendered: {
            description:
              "Whether the icon already incorporates a shine effect.",
            type: "boolean",
          },
        },
        required: ["filename", "prerendered"],
        "exclude-from-codegen": true,
      },
      apple: {
        type: "object",
        properties: {
          bundleIdentifier: {
            description:
              "Use this property to set the bundle identifier of the final app bundle. This is the same as setting `PRODUCT_BUNDLE_IDENTIFIER` in Xcode.",
            type: "string",
          },
          buildNumber: {
            description: extractBrief(await docs["ios.buildNumber"]),
            markdownDescription: await docs["ios.buildNumber"],
            type: "string",
          },
          icons: {
            description: extractBrief(await docs["ios.icons"]),
            markdownDescription: await docs["ios.icons"],
            type: "object",
            properties: {
              primaryIcon: {
                description: extractBrief(await docs["ios.icons.primaryIcon"]),
                markdownDescription: await docs["ios.icons.primaryIcon"],
                allOf: [{ $ref: "#/$defs/appIconSet" }],
              },
              alternateIcons: {
                description: extractBrief(
                  await docs["ios.icons.alternateIcons"]
                ),
                markdownDescription: await docs["ios.icons.alternateIcons"],
                type: "object",
                additionalProperties: {
                  allOf: [{ $ref: "#/$defs/appIconSet" }],
                  type: "object",
                },
              },
            },
            required: ["primaryIcon"],
          },
          codeSignEntitlements: {
            description: extractBrief(await docs["ios.codeSignEntitlements"]),
            markdownDescription: await docs["ios.codeSignEntitlements"],
            type: "string",
          },
          codeSignIdentity: {
            description: extractBrief(await docs["ios.codeSignIdentity"]),
            markdownDescription: await docs["ios.codeSignIdentity"],
            type: "string",
          },
          developmentTeam: {
            description: extractBrief(await docs["ios.developmentTeam"]),
            markdownDescription: await docs["ios.developmentTeam"],
            type: "string",
          },
        },
        "exclude-from-codegen": true,
      },
      component: {
        type: "object",
        properties: {
          appKey: {
            description:
              "The app key passed to `AppRegistry.registerComponent()`.",
            type: "string",
          },
          displayName: {
            description: "Name to be displayed on home screen.",
            type: "string",
          },
          initialProperties: {
            description: "Properties that should be passed to your component.",
            type: "object",
          },
          presentationStyle: {
            description: "The style in which to present your component.",
            type: "string",
            enum: ["default", "modal"],
          },
          slug: {
            description:
              "URL slug that uniquely identifies this component. Used for deep linking.",
            type: "string",
          },
        },
        required: ["appKey"],
      },
      manifest: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          displayName: {
            type: "string",
          },
          version: {
            description: extractBrief(await docs.version),
            markdownDescription: await docs.version,
            type: "string",
          },
          bundleRoot: {
            description: extractBrief(await docs.bundleRoot),
            markdownDescription: await docs.bundleRoot,
            type: "string",
          },
          singleApp: {
            description: extractBrief(await docs.singleApp),
            markdownDescription: await docs.singleApp,
            type: "string",
          },
          components: {
            description: extractBrief(await docs.components),
            markdownDescription: await docs.components,
            type: "array",
            items: { $ref: "#/$defs/component" },
          },
        },
        required: ["name", "displayName"],
      },
      signingConfig: {
        type: "object",
        properties: {
          keyAlias: {
            description:
              "Use this property to specify the alias of key to use in the store",
            type: "string",
          },
          keyPassword: {
            description:
              "Use this property to specify the password of key in the store",
            type: "string",
          },
          storeFile: {
            description:
              "Use this property to specify the relative file path to the key store file",
            type: "string",
          },
          storePassword: {
            description:
              "Use this property to specify the password of the key store",
            type: "string",
          },
        },
        required: ["storeFile"],
        "exclude-from-codegen": true,
      },
    },
    allOf: [{ $ref: "#/$defs/manifest" }],
    type: "object",
    properties: {
      resources: {
        description: extractBrief(await docs.resources),
        markdownDescription: await docs.resources,
        oneOf: [
          {
            type: "array",
            items: { type: "string" },
            uniqueItems: true,
          },
          {
            type: "object",
            properties: {
              android: {
                type: "array",
                items: { type: "string" },
                uniqueItems: true,
              },
              ios: {
                type: "array",
                items: { type: "string" },
                uniqueItems: true,
              },
              macos: {
                type: "array",
                items: { type: "string" },
                uniqueItems: true,
              },
              windows: {
                type: "array",
                items: { type: "string" },
                uniqueItems: true,
              },
            },
          },
        ],
      },
      android: {
        description: "Android specific properties go here.",
        type: "object",
        properties: {
          package: {
            description:
              "Use this property to set the <a href='https://developer.android.com/studio/build/application-id'>application ID</a> of the APK. The value is set to `applicationId` in `build.gradle`.",
            type: "string",
          },
          versionCode: {
            description: extractBrief(await docs["android.versionCode"]),
            markdownDescription: await docs["android.versionCode"],
            type: "number",
          },
          icons: {
            description: extractBrief(await docs["android.icons"]),
            markdownDescription: await docs["android.icons"],
            type: "string",
          },
          signingConfigs: {
            description: extractBrief(await docs["android.signingConfigs"]),
            markdownDescription: await docs["android.signingConfigs"],
            type: "object",
            properties: {
              debug: {
                description:
                  "Use this property for the debug signing config for the app. The value `storeFile` is required. Android defaults will be provided for other properties.",
                allOf: [{ $ref: "#/$defs/signingConfig" }],
                type: "object",
              },
              release: {
                description:
                  "Use this property for the release signing config for the app. The value `storeFile` is required. Android defaults will be provided for other properties.",
                allOf: [{ $ref: "#/$defs/signingConfig" }],
                type: "object",
              },
            },
          },
        },
      },
      ios: {
        description: "iOS specific properties go here.",
        allOf: [{ $ref: "#/$defs/apple" }],
        type: "object",
        properties: {
          reactNativePath: {
            description:
              'Sets a custom path to React Native. Useful for when `require("react-native")` does not return the desired path.',
            type: "string",
          },
        },
      },
      macos: {
        description: "macOS specific properties go here.",
        allOf: [{ $ref: "#/$defs/apple" }],
        type: "object",
        properties: {
          reactNativePath: {
            description:
              'Sets a custom path to React Native for macOS. Useful for when `require("react-native-macos")` does not return the desired path.',
            type: "string",
          },
        },
      },
      windows: {
        description: "Windows specific properties go here.",
        type: "object",
        properties: {
          appxManifest: {
            description: extractBrief(await docs["windows.appxManifest"]),
            markdownDescription: await docs["windows.appxManifest"],
            type: "string",
          },
          certificateKeyFile: {
            description: extractBrief(await docs["windows.certificateKeyFile"]),
            markdownDescription: await docs["windows.certificateKeyFile"],
            type: "string",
          },
          certificatePassword: {
            description: extractBrief(
              await docs["windows.certificatePassword"]
            ),
            markdownDescription: await docs["windows.certificatePassword"],
            type: "string",
          },
          certificateThumbprint: {
            description: extractBrief(
              await docs["windows.certificateThumbprint"]
            ),
            markdownDescription: await docs["windows.certificateThumbprint"],
            type: "string",
          },
        },
      },
    },
  };
}

if (process.argv[1] === thisScript) {
  generateSchema()
    .then((schema) => {
      for (const def of Object.values(schema.$defs)) {
        // @ts-expect-error This is a noop if it doesn't exist
        delete def["exclude-from-codegen"];
      }
      return trimCarriageReturn(JSON.stringify(schema, undefined, 2)) + "\n";
    })
    .then((schema) => fs.writeFile("schema.json", schema))
    .catch(console.error);
}
