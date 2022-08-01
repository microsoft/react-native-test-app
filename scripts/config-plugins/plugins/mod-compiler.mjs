// @ts-check
import { BaseMods, evalModsAsync } from "../ExpoConfigPlugins.mjs";
import { getAndroidModFileProviders } from "./withAndroidBaseMods.mjs";
import { getIosModFileProviders } from "./withIosBaseMods.mjs";

/** @type {import("@expo/config-plugins").withDefaultBaseMods} */
export const withDefaultBaseMods = (config, props) => {
  config = BaseMods.withIosBaseMods(config, {
    ...props,
    providers: getIosModFileProviders(),
  });
  config = BaseMods.withAndroidBaseMods(config, {
    ...props,
    providers: getAndroidModFileProviders(),
  });
  return config;
};

/** @type {import("@expo/config-plugins").compileModsAsync} */
export const compileModsAsync = (config, props) => {
  if (props.introspect === true) {
    console.warn("`introspect` is not supported by react-native-test-app");
  }

  config = withDefaultBaseMods(config);
  return evalModsAsync(config, props);
};
