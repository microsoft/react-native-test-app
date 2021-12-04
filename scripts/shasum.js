#!/usr/bin/env node
// @ts-check

/**
 * @param {string} filename
 * @param {string=} algorithm
 * @returns {string}
 */
function hashFile(filename, algorithm = "sha256") {
  const data = require("fs")
    .readFileSync(filename, { encoding: "utf-8" })
    .replace(/\r/g, "");
  return require("crypto").createHash(algorithm).update(data).digest("hex");
}

const { [2]: filename } = process.argv;
console.log(hashFile(filename));
