// @ts-check
import { createModFileProviders } from "./cocoaBaseMods.mjs";
import { makeFilePathModifier } from "../provider.mjs";

const modifyFilePath = makeFilePathModifier("node_modules/.generated/macos");
const defaultProviders = createModFileProviders(modifyFilePath);

export function getMacOsModFileProviders() {
  return defaultProviders;
}
