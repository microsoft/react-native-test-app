// @ts-check
import * as fs from "node:fs/promises";
import { withPlugins } from "./ExpoConfigPlugins.mjs";
import { compileModsAsync } from "./plugins/mod-compiler.mjs";
import { withInternal } from "./plugins/withInternal.mjs";

/**
 * Applies config plugins.
 * @param {import("./types.js").ProjectInfo} projectInfo
 * @returns {Promise<Awaited<ReturnType<typeof compileModsAsync>> | undefined>}
 */
export async function applyConfigPlugins({ appJsonPath, ...info }) {
  if (!appJsonPath) {
    return;
  }

  const content = await fs.readFile(appJsonPath, { encoding: "utf-8" });
  const { plugins, ...config } = JSON.parse(content);
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return;
  }

  return compileModsAsync(
    withPlugins(withInternal(config, info), plugins),
    info
  );
}
