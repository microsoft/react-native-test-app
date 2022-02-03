#!/usr/bin/env node
// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");

try {
  const nativeModulesScript = path.join(
    path.dirname(
      require.resolve(
        "@react-native-community/cli-platform-android/package.json"
      )
    ),
    "native_modules.gradle"
  );

  const script = fs.readFileSync(nativeModulesScript, { encoding: "utf-8" });
  const patched = script.replace(
    "ArrayList<HashMap<String, String>>[] packages = this.reactNativeModules",
    "ArrayList<HashMap<String, String>> packages = this.reactNativeModules"
  );
  if (patched !== script) {
    fs.writeFileSync(nativeModulesScript, patched);
  }
} catch (_) {
  // Ignore if we cannot patch
}
