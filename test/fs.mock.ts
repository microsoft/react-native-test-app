/* node:coverage disable */
import type { DirectoryJSON } from "memfs";
import { fs as memfs, vol } from "memfs";
import * as path from "node:path";
import { mkdir_p, rm_r } from "../scripts/utils/filesystem.mjs";

export const fs = memfs as unknown as typeof import("node:fs");

// Add simple `cpSync` implementation until memfs implements it
fs.cpSync =
  fs.cpSync ??
  ((src: string, dst: string, options) => {
    const srcStat = fs.statSync(src);
    if (!srcStat.isDirectory()) {
      return fs.copyFileSync(src, dst);
    }

    rm_r(dst, fs);
    mkdir_p(dst, fs);

    for (const filename of fs.readdirSync(src)) {
      const p = path.join(src, filename);
      const finalDst = path.join(dst, filename);

      const pStat = fs.statSync(p);
      if (pStat.isDirectory()) {
        fs.cpSync(p, finalDst, options);
      } else {
        fs.copyFileSync(p, finalDst);
      }
    }
  });

export function setMockFiles(files: DirectoryJSON = {}) {
  vol.reset();
  vol.fromJSON(files);
}

export function toJSON(): DirectoryJSON {
  return vol.toJSON();
}
