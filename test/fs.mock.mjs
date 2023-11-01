/* node:coverage disable */
import { fs as memfs, vol } from "memfs";

export const fs = /** @type {import("node:fs")} */ (
  /** @type {unknown} */ (memfs)
);

/**
 * @param {import("memfs").DirectoryJSON} files
 */
export function setMockFiles(files = {}) {
  vol.reset();
  vol.fromJSON(files);
}

/**
 * @returns {import("memfs").DirectoryJSON}
 */
export function toJSON() {
  return vol.toJSON();
}
