// @ts-check
import { createModFileProviders } from "./cocoaBaseMods.mjs";
import { BaseMods } from "../ExpoConfigPlugins.mjs";
import { makeFilePathModifier } from "../provider.mjs";

const modifyFilePath = makeFilePathModifier("node_modules/.generated/ios");
const defaultProviders = createModFileProviders(modifyFilePath);

// `react-native-test-app` files
defaultProviders["sceneDelegate"] = modifyFilePath(
  BaseMods.getIosModFileProviders().appDelegate,
  "ReactTestApp/SceneDelegate.swift"
);

export function getIosModFileProviders() {
  return defaultProviders;
}
