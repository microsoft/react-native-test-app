// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { spawnSync } from "node:child_process";

export const TAG = "┃";

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
export function $$(command, ...args) {
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

export function log(message = "", tag = TAG) {
  console.log(tag, message);
}

/**
 * @param {string} message
 */
export function showBanner(message) {
  log();
  log(message, "┗━━▶");
  log("", "");
}
