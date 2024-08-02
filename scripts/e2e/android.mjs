// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import * as fs from "node:fs";
import { readTextFile } from "../helpers";
import { $ } from "./shell.mjs";

/** @typedef {import("../types.js").BuildConfig} BuildConfig */

/**
 * Configures Gradle.
 * @param {Required<BuildConfig>} config
 * @returns {Promise<void>}
 */
export function configureGradle({ variant }) {
  if (variant === "fabric") {
    const properties = "android/gradle.properties";
    const content = readTextFile(properties);
    fs.writeFileSync(
      properties,
      content.replace("#newArchEnabled=true", "newArchEnabled=true")
    );
  }
  return Promise.resolve();
}

export function installAPK(androidHome = process.env["ANDROID_HOME"]) {
  // Note: Ubuntu agents can't run Android emulators — see
  // https://github.com/actions/runner-images/issues/6253#issuecomment-1255952240
  const adb = androidHome + "/platform-tools/adb";

  /*
  const android_image = "system-images;android-30;google_atd;x86_64";
  const avdmanager = androidHome + "/cmdline-tools/latest/bin/avdmanager";
  const emulator = androidHome + "/emulator/emulator";
  const sdkmanager = androidHome + "/cmdline-tools/latest/bin/sdkmanager";

  if [[ -n $CI ]]; then
    # Accept all licenses so we can download an Android image
    yes 2> /dev/null | $sdkmanager --licenses
    $sdkmanager --install "$android_image"

    # Create an Android emulator and boot it up
    echo "no" | $avdmanager create avd --package "$android_image" --name Android_E2E
    $emulator @Android_E2E -delay-adb -partition-size 4096 -no-snapshot -no-audio -no-boot-anim -no-window -gpu swiftshader_indirect &
  fi
   */

  // Wait for the emulator to boot up before we install the app
  $(adb, "wait-for-device");
  $(adb, "install", "android/app/build/outputs/apk/debug/app-debug.apk");
}
