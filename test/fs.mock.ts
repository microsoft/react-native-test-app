/* node:coverage disable */
import type { DirectoryJSON } from "memfs";
import { fs as memfs, vol } from "memfs";

export const fs = memfs as unknown as typeof import("node:fs");

export function setMockFiles(files: DirectoryJSON = {}) {
  vol.reset();
  vol.fromJSON(files);
}

export function toJSON(): DirectoryJSON {
  return vol.toJSON();
}
