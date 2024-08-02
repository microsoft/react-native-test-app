// @ts-check

/**
 * Reminder that this script is meant to be runnable without installing
 * dependencies. It can therefore not rely on any external libraries.
 */
import { red } from "../colors.mjs";
import { log } from "./shell.mjs";

/** @typedef {import("../types.js").BuildConfig} BuildConfig */

/**
 * Generates Visual Studio solution.
 * @param {Required<BuildConfig>} config
 * @returns {Promise<void>}
 */
export async function generateSolution({ projectRoot, variant }) {
  // This module must be imported inline because it has external dependencies
  const { generateSolution } = await import("../../windows/test-app.mjs");

  const useFabric = variant === "fabric";
  const error = generateSolution(projectRoot, {
    autolink: true,
    useFabric,
    useNuGet: !useFabric,
  });
  if (error) {
    log(red(error));
    process.exitCode = -1;
  }
}
