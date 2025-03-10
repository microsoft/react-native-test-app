/* node:coverage disable */
import type { DirectoryJSON } from "memfs";
import { fs as memfs, vol } from "memfs";

export const fs = memfs as unknown as typeof import("node:fs");

// Stub `cpSync` until memfs implements it
fs.cpSync = fs.cpSync ?? (() => undefined);

export function setMockFiles(files: DirectoryJSON = {}) {
  vol.reset();
  vol.fromJSON(files);
}

export function toJSON(): DirectoryJSON {
  return vol.toJSON();
}
