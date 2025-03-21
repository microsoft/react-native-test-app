/* node:coverage disable */
import type { DirectoryJSON } from "memfs";
import { fs as memfs, vol } from "memfs";
import * as path from "node:path";
import { mkdir_p } from "../scripts/utils/filesystem.mjs";

export const fs = memfs as unknown as typeof import("node:fs");

// Add simple `cpSync` implementation until memfs implements it
fs.cpSync =
  fs.cpSync ??
  ((src: string, dst: string, options) => {
    const srcStat = fs.statSync(src);
    const dstStat = fs.statSync(dst);
    if (!srcStat.isDirectory()) {
      const finalDst = dstStat.isDirectory()
        ? path.join(dst, path.basename(src))
        : dst;
      return fs.copyFileSync(src, finalDst);
    }

    let finalDst: string;
    if (!dstStat.isDirectory()) {
      fs.rmSync(dst);
      finalDst = dst;
    } else {
      finalDst = path.join(dst, path.basename(src));
    }

    mkdir_p(finalDst, fs);
    for (const filename of fs.readdirSync(src)) {
      const p = path.join(src, filename);
      const pStat = fs.statSync(p);
      if (pStat.isDirectory()) {
        if (options?.recursive) {
          fs.cpSync(p, finalDst, options);
        } else {
          mkdir_p(path.join(finalDst, filename));
        }
      } else {
        fs.copyFileSync(p, path.join(finalDst, filename));
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
