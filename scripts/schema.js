/**
 * @typedef {import("./types").Docs} Docs
 */

/**
 * @param {string} content
 * @returns {string}
 */
function extractBrief(content = "") {
  const endBrief = content.indexOf("\n\n");
  return endBrief > 0 ? content.substring(0, endBrief) : content;
}

/**
 * @param {Partial<Docs>=} docs App manifest documentation
 * @returns {import("ajv").SchemaObject}
 */
function generateSchema(docs = {}) {
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
            description: extractBrief(docs["ios.buildNumber"]),
            markdownDescription: docs["ios.buildNumber"],
            type: "string",
          },
          icons: {
            description: extractBrief(docs["ios.icons"]),
            markdownDescription: docs["ios.icons"],
            type: "object",
            properties: {
              primaryIcon: {
                description: extractBrief(docs["ios.icons.primaryIcon"]),
                markdownDescription: docs["ios.icons.primaryIcon"],
                allOf: [{ $ref: "#/$defs/appIconSet" }],
              },
              alternateIcons: {
                description: extractBrief(docs["ios.icons.alternateIcons"]),
                markdownDescription: docs["ios.icons.alternateIcons"],
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
            description: extractBrief(docs["ios.codeSignEntitlements"]),
            markdownDescription: docs["ios.codeSignEntitlements"],
            type: "string",
          },
          codeSignIdentity: {
            description: extractBrief(docs["ios.codeSignIdentity"]),
            markdownDescription: docs["ios.codeSignIdentity"],
            type: "string",
          },
          developmentTeam: {
            description: extractBrief(docs["ios.developmentTeam"]),
            markdownDescription: docs["ios.developmentTeam"],
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
            description: extractBrief(docs.version),
            markdownDescription: docs.version,
            type: "string",
          },
          bundleRoot: {
            description: extractBrief(docs.bundleRoot),
            markdownDescription: docs.bundleRoot,
            type: "string",
          },
          singleApp: {
            description: extractBrief(docs.singleApp),
            markdownDescription: docs.singleApp,
            type: "string",
          },
          components: {
            description: extractBrief(docs.components),
            markdownDescription: docs.components,
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
        description: extractBrief(docs.resources),
        markdownDescription: docs.resources,
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
            description: extractBrief(docs["android.versionCode"]),
            markdownDescription: docs["android.versionCode"],
            type: "number",
            minimum: 0,
          },
          icons: {
            description: extractBrief(docs["android.icons"]),
            markdownDescription: docs["android.icons"],
            type: "string",
          },
          signingConfigs: {
            description: extractBrief(docs["android.signingConfigs"]),
            markdownDescription: docs["android.signingConfigs"],
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
            description: extractBrief(docs["windows.appxManifest"]),
            markdownDescription: docs["windows.appxManifest"],
            type: "string",
          },
          certificateKeyFile: {
            description: extractBrief(docs["windows.certificateKeyFile"]),
            markdownDescription: docs["windows.certificateKeyFile"],
            type: "string",
          },
          certificatePassword: {
            description: extractBrief(docs["windows.certificatePassword"]),
            markdownDescription: docs["windows.certificatePassword"],
            type: "string",
          },
          certificateThumbprint: {
            description: extractBrief(docs["windows.certificateThumbprint"]),
            markdownDescription: docs["windows.certificateThumbprint"],
            type: "string",
          },
        },
      },
    },
  };
}

exports.generateSchema = generateSchema;
