// @ts-check
/** @import { ExportedConfig } from "@expo/config-plugins"; */
import { BaseMods, evalModsAsync } from "../ExpoConfigPlugins.mjs";
import { getAndroidModFileProviders } from "./withAndroidBaseMods.mjs";
import { getIosModFileProviders } from "./withIosBaseMods.mjs";
import { getMacOsModFileProviders } from "./withMacOsBaseMods.mjs";

/** @type {(config: ExportedConfig, props?: Record<string, unknown>) => ExportedConfig} */
export const withDefaultBaseMods = (config, props) => {
  config = BaseMods.withIosBaseMods(config, {
    ...props,
    providers: getIosModFileProviders(),
  });
  config = BaseMods.withAndroidBaseMods(config, {
    ...props,
    providers: getAndroidModFileProviders(),
  });
  config = BaseMods.withGeneratedBaseMods(config, {
    ...props,
    // @ts-expect-error `macos` is not assignable to type `android | ios`
    platform: "macos",
    providers: getMacOsModFileProviders(),
  });
  return config;
};

/** @type {typeof evalModsAsync} */
export const compileModsAsync = (config, props) => {
  if (props.introspect === true) {
    console.warn("`introspect` is not supported by react-native-test-app");
  }

  config = withDefaultBaseMods(config);
  return evalModsAsync(config, props);
};
