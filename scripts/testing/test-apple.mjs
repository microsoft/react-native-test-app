// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { URL, fileURLToPath } from "node:url";
import { memo, readTextFile } from "../helpers.js";
import { $ } from "./test-e2e.mjs";

/** @import { BuildConfig } from "../types.js"; */

export const getIOSSimulatorName = memo(() => {
  const wdioConfig = new URL(
    "../../example/test/specs/wdio.config.mjs",
    import.meta.url
  );
  const { status, stdout } = spawnSync(
    process.argv[0],
    [
      "--eval",
      `import("${fileURLToPath(wdioConfig)}").then((config) => console.log(config.iosSimulatorName()))`,
    ],
    {
      stdio: ["ignore", "pipe", "inherit"],
      env: { TEST_ARGS: "ios" },
      encoding: "utf-8",
    }
  );
  if (status !== 0) {
    throw new Error(
      "An error occurred while trying to evaluate 'wdio.config.mjs'"
    );
  }
  return stdout.trim();
});

/**
 * Configures `Podfile` and invokes `pod install`.
 * @param {Required<BuildConfig>} config
 * @returns {Promise<void>}
 */
export function installPods({ platform, engine, variant }) {
  const podfile = `${platform}/Podfile`;
  let content = readTextFile(podfile);

  if (engine === "hermes") {
    content = content.replace(
      ":hermes_enabled => false",
      ":hermes_enabled => true"
    );
  }
  if (variant === "fabric") {
    content = content.replace(
      ":fabric_enabled => false",
      ":fabric_enabled => true"
    );
  }

  fs.writeFileSync(podfile, content);

  const options = {
    force: true,
    maxRetries: 3,
    recursive: true,
    retryDelay: 500,
  };
  fs.rmSync(`${platform}/Podfile.lock`, options);
  fs.rmSync(`${platform}/Pods`, options);
  fs.rmSync(`${platform}/build`, options);
  $("pod", "install", `--project-directory=${platform}`);

  return Promise.resolve();
}
