// @ts-check
import { makeFilePathModifier } from "../provider.mjs";
import { createModFileProviders } from "./cocoaBaseMods.mjs";

const modifyFilePath = makeFilePathModifier("node_modules/.generated/macos");
const defaultProviders = createModFileProviders(modifyFilePath);

export function getMacOsModFileProviders() {
  return defaultProviders;
}
