#!/usr/bin/env -S node --experimental-transform-types --no-warnings

import { spawnSync } from "node:child_process";

const DEVICE_ID = "T-800";

/**
 * Runs the specified command.
 */
function run(successPattern: RegExp, ...args: readonly string[]) {
  const { stderr } = spawnSync("yarn", args, { encoding: "utf-8" });
  if (!successPattern.test(stderr)) {
    throw new Error(stderr);
  }
}

function runAndroid() {
  // If `@react-native-community/cli` reaches the point where it is looking for
  // a device, we can assume that it has successfully created a config and
  // determined that there is an Android project that can be built and launched.
  const success = /No Android device or emulator connected/;
  run(success, "android", "--deviceId", DEVICE_ID);
}

function runIOS() {
  // If `@react-native-community/cli` reaches the point where it is looking for
  // a device, we can assume that it has successfully created a config and
  // determined that there is an iOS project that can be built and launched.
  const success = new RegExp(`Could not find .*: "${DEVICE_ID}"`);
  run(success, "ios", "--device", DEVICE_ID);
}

function runMacOS() {
  throw new Error("Function not implemented.");
}

function runWindows() {
  throw new Error("Function not implemented.");
}

function runVisionOS() {
  throw new Error("Function not implemented.");
}

const { [2]: command } = process.argv;
switch (command) {
  case "run-android":
    runAndroid();
    break;

  case "run-ios":
    runIOS();
    break;

  case "run-macos":
    runMacOS();
    break;

  case "run-visionos":
    runVisionOS();
    break;

  case "run-windows":
    runWindows();
    break;

  default:
    throw new Error(`Unknown command: ${command}`);
}
