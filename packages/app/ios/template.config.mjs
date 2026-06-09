// @ts-check
import * as nodefs from "node:fs";

/** @import { ProjectConfig, ProjectParams } from "../scripts/types.js"; */

/**
 * @param {string} _projectRoot
 * @param {Required<ProjectConfig>["ios"]} config
 * @returns {ProjectParams["ios"] | undefined}
 */
export function configure(_projectRoot, config, _fs = nodefs) {
  return config;
}
