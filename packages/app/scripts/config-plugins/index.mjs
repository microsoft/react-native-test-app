// @ts-check
import { getAndroidModFileProviders } from "./plugins/withAndroidBaseMods.mjs";
import { getIosModFileProviders } from "./plugins/withIosBaseMods.mjs";
import { getMacOsModFileProviders } from "./plugins/withMacOsBaseMods.mjs";

export { applyConfigPlugins } from "./apply.mjs";
export {
  compileModsAsync,
  withDefaultBaseMods,
} from "./plugins/mod-compiler.mjs";
export { withInternal } from "./plugins/withInternal.mjs";

export const BaseMods = {
  getAndroidModFileProviders,
  getIosModFileProviders,
  getMacOsModFileProviders,
};
