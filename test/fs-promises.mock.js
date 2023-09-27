/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* node:coverage disable */
const { vol } = require("memfs");

/** @type {import("node:fs/promises")} */
module.exports = {
  copyFile: (...args) => vol.promises.copyFile(...args),
  mkdir: (...args) => vol.promises.mkdir(...args),
  rm: (...args) => vol.promises.rm(...args),
  writeFile: (...args) => vol.promises.writeFile(...args),
};
