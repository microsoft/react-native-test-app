#!/usr/bin/env node
// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");

// TODO: Remove when `@react-native-community/cli` 6.0+ is required. See also
// https://github.com/react-native-community/cli/commit/fa0d09b2c9be144bbdff526bb14f171d7ddca88e
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
