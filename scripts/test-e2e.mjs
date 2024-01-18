#!/usr/bin/env node
// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawnSync } from "node:child_process";
import { Socket } from "node:net";

/**
 * Invokes a shell command with optional arguments.
 * @param {string} command
 * @param {...string} args
 */
export function $(command, ...args) {
  const { status } = spawnSync(command, args, { stdio: "inherit" });
  if (status !== 0) {
    throw new Error(
      `An error occurred while executing: ${command} ${args.join(" ")}`
    );
  }
}

/**
 * Invokes a shell command with optional arguments. Similar {@link $}, but
 * captures and returns stdout/stderr.
 * @param {string} command
 * @param {...string} args
 * @returns {string}
 */
function $$(command, ...args) {
  const { status, stderr, stdout } = spawnSync(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
  });
  if (status !== 0) {
    throw new Error(
      `An error occurred while executing: ${command} ${args.join(" ")}`
    );
  }
  // Some commands, like `appium driver list --installed` output to stderr
  return stdout.trim() || stderr.trim();
}

/**
 * Ensures Appium is available.
 * @returns {Promise<void>}
 */
function ensureAppiumAvailable() {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    socket.setTimeout(60);

    const onError = () => {
      socket.destroy();
      reject(new Error("Could not find Appium server"));
    };

    socket.once("error", onError);
    socket.once("timeout", onError);

    socket.connect(4723, "localhost", () => {
      socket.end();
      resolve();
    });
  });
}

function prepareAndroid(androidHome = process.env["ANDROID_HOME"]) {
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

/**
 * @param {string} target
 * @param {string[]=} args
 */
export async function test(target, args = []) {
  switch (target) {
    case "android":
      prepareAndroid();
      break;

    case "ios":
      break;

    default:
      console.error(`Unknown target: ${target}`);
      return 1;
  }

  await ensureAppiumAvailable();

  const tests = $$("git", "ls-files", "*.spec.mjs").split("\n");
  try {
    process.env["TEST_ARGS"] = `${target} ${args.join(" ")}`;
    $(process.argv[0], "--test", ...tests);
  } finally {
    delete process.env["TEST_ARGS"];
  }

  return 0;
}

const [, script, target, ...args] = process.argv;
if (import.meta.url.endsWith(script)) {
  test(target, args).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
