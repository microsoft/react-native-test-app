// @ts-check
import { BaseMods } from "../ExpoConfigPlugins.mjs";
import { makeFilePathModifier } from "../provider.mjs";

const modifyFilePath = makeFilePathModifier(
  "node_modules/react-native-test-app/android"
);

// https://github.com/expo/expo/blob/93cd0503117d5a25f8b80ed7b30ec5bed3a67c24/packages/@expo/config-plugins/src/plugins/withAndroidBaseMods.ts
const expoProviders = BaseMods.getAndroidModFileProviders();

/** @type {typeof expoProviders} */
const defaultProviders = {
  dangerous: expoProviders.dangerous,
  finalized: expoProviders.finalized,
  manifest: modifyFilePath(
    expoProviders.manifest,
    "app/src/main/AndroidManifest.xml"
  ),
  gradleProperties: expoProviders.gradleProperties,
  strings: modifyFilePath(
    expoProviders.strings,
    "app/src/main/res/values/strings.xml"
  ),
  colors: modifyFilePath(
    expoProviders.colors,
    "app/src/main/res/values/colors.xml"
  ),
  colorsNight: modifyFilePath(
    expoProviders.colors,
    "app/src/main/res/values-night/colors.xml"
  ),
  styles: modifyFilePath(
    expoProviders.styles,
    "app/src/main/res/values/styles.xml"
  ),
  projectBuildGradle: expoProviders.projectBuildGradle,
  settingsGradle: expoProviders.settingsGradle,
  appBuildGradle: expoProviders.appBuildGradle,
  mainActivity: modifyFilePath(
    expoProviders.mainActivity,
    "app/src/main/java/com/microsoft/reacttestapp/MainActivity.kt"
  ),
  mainApplication: modifyFilePath(
    expoProviders.mainApplication,
    "app/src/main/java/com/microsoft/reacttestapp/TestApp.kt"
  ),
};

export function getAndroidModFileProviders() {
  return defaultProviders;
}
