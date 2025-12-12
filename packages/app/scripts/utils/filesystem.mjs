// @ts-check
import * as nodefs from "node:fs";

const CP_R_OPTIONS = { force: true, recursive: true };
const MKDIR_P_OPTIONS = { recursive: true, mode: 0o755 };
const RM_R_OPTIONS = { force: true, maxRetries: 3, recursive: true };

/**
 * @param {string} source
 * @param {string} destination
 */
export function cp_r(source, destination, fs = nodefs) {
  fs.cpSync(source, destination, CP_R_OPTIONS);
}

/**
 * @param {string} p
 */
export function mkdir_p(p, fs = nodefs) {
  fs.mkdirSync(p, MKDIR_P_OPTIONS);
}

/**
 * @param {string} p
 */
export function rm_r(p, fs = nodefs) {
  fs.rmSync(p, RM_R_OPTIONS);
}

/**
 * @param {string} path
 * @param {unknown} obj
 */
export function writeJSONFile(path, obj, fs = nodefs) {
  const fd = fs.openSync(path, "w", 0o644);
  fs.writeSync(fd, JSON.stringify(obj, undefined, 2));
  fs.writeSync(fd, "\n");
  fs.closeSync(fd);
}
