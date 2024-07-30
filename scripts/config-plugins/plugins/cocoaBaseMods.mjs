// @ts-check
import { createRequire } from "node:module";
import * as path from "node:path";
import { BaseMods } from "../ExpoConfigPlugins.mjs";
import { makeFilePathModifier, makeNullProvider } from "../provider.mjs";

const require = createRequire(import.meta.url);

/**
 * @param {import("../types.js").CustomModProvider} modifyFilePath
 * @returns {import("../types.js").IosModFileProviders}
 */
export function createModFileProviders(modifyFilePath) {
  const modifyReactNativeHostFilePath = makeFilePathModifier(
    path.dirname(require.resolve("@rnx-kit/react-native-host/package.json"))
  );

  const nullProvider = makeNullProvider();

  // https://github.com/expo/expo/blob/sdk-51/packages/%40expo/config-plugins/src/plugins/withIosBaseMods.ts
  const expoProviders = BaseMods.getIosModFileProviders();

  /** @type {import("../types.js").IosModFileProviders} */
  const defaultProviders = {
    dangerous: expoProviders.dangerous,
    finalized: expoProviders.finalized,
    appDelegate: modifyFilePath(
      expoProviders.appDelegate,
      "ReactTestApp/AppDelegate.swift"
    ),
    expoPlist: nullProvider,
    xcodeproj: modifyFilePath(
      expoProviders.xcodeproj,
      "ReactTestApp.xcodeproj/project.pbxproj"
    ),
    infoPlist: modifyFilePath(expoProviders.infoPlist, "Info.plist"),
    entitlements: nullProvider,
    podfile: makeNullProvider({
      path: "",
      language: /** @type {const} */ ("rb"),
      contents: "",
    }),
    podfileProperties: makeNullProvider(),
  };

  // `@rnx-kit/react-native-host` files
  defaultProviders["reactNativeHost"] = modifyReactNativeHostFilePath(
    expoProviders.appDelegate,
    "cocoa/ReactNativeHost.mm"
  );

  return defaultProviders;
}
