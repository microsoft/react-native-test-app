// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { Socket } from "node:net";
import { installAPK } from "./e2e/android.mjs";
import { $, $$ } from "./e2e/shell.mjs";
import { isMain } from "./helpers.js";

/**
 * Ensures Appium is available.
 * @returns {Promise<void>}
 */
function ensureAppiumAvailable() {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    socket.setTimeout(60 * 1000);

    /** @type {(e: Error) => void} */
    const onError = (e) => {
      socket.destroy();
      reject(new Error(`Could not connect to Appium server: ${e}`));
    };

    socket.once("error", onError);
    socket.once("timeout", onError);

    socket.connect(4723, "127.0.0.1", () => {
      socket.end();
      resolve();
    });
  });
}

/**
 * @param {string} target
 * @param {string[]=} args
 */
export async function test(target, args = []) {
  switch (target) {
    case "android":
      installAPK();
      break;

    case "ios":
    case "macos":
    case "visionos":
    case "windows":
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

const [, , target, ...args] = process.argv;
if (isMain(import.meta.url)) {
  test(target, args).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
