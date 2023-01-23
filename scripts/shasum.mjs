#!/usr/bin/env node
// @ts-check

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * @param {string[]} files
 * @param {string=} algorithm
 * @returns {string}
 */
function hashFiles(files, algorithm = "sha256") {
  const data = files
    .map((file) => {
      return readFileSync(file, { encoding: "utf-8" }).replace(/\r/g, "");
    })
    .join("\n");
  return createHash(algorithm).update(data).digest("hex");
}

const files = process.argv.slice(2);
console.log(hashFiles(files));
