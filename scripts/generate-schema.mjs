#!/usr/bin/env node
// @ts-check

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const docsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "docs");

/**
 * @param {string} content
 * @returns {string}
 */
function extractBrief(content) {
  const endBrief = content.indexOf("\n\n");
  return content.substring(0, endBrief);
}

/**
 * @param {string} name
 * @returns {Promise<string>}
 */
function readMarkdown(name) {
  const filename = path.join(docsDir, name + ".md");
  return fs.readFile(filename, { encoding: "utf-8" });
}

async function main() {
  const docs = {
    bundleRoot: null,
    components: null,
    resources: null,
    singleApp: null,
    "android.signingConfigs": null,
    "ios.codeSignEntitlements": null,
    "ios.codeSignIdentity": null,
    "ios.developmentTeam": null,
    "windows.appxManifest": null,
    "windows.certificateKeyFile": null,
    "windows.certificatePassword": null,
    "windows.certificateThumbprint": null,
  };
  for (const key of Object.keys(docs)) {
    docs[key] = readMarkdown(key);
  }

  const schema = {
    $defs: {
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
        type: "object",
        properties: {
          bundleIdentifier: {
            description:
              "Use this property to set the bundle identifier of the final app bundle. This is the same as setting `PRODUCT_BUNDLE_IDENTIFIER` in Xcode.",
            type: "string",
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
          reactNativePath: {
            description:
              'Sets a custom path to React Native. Useful for when `require("react-native")` does not return the desired path.',
            type: "string",
          },
        },
      },
      macos: {
        description: "macOS specific properties go here.",
        type: "object",
        properties: {
          bundleIdentifier: {
            description:
              "Use this property to set the bundle identifier of the final app bundle. This is the same as setting `PRODUCT_BUNDLE_IDENTIFIER` in Xcode.",
            type: "string",
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

  return fs.writeFile(
    "schema.json",
    JSON.stringify(schema, undefined, 2) + "\n"
  );
}

main().catch(console.error);
