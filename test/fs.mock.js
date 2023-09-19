/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// istanbul ignore file
const { vol } = require("memfs");

/**
 * @type {import("node:fs") & {
 *   __setMockFiles: (newMockFiles?: import("memfs").DirectoryJSON) => void;
 *   __toJSON: () => import("memfs").DirectoryJSON;
 * }}
 */
module.exports = {
  __setMockFiles: (files = {}) => {
    vol.reset();
    vol.fromJSON(files);
  },

  __toJSON: () => vol.toJSON(),

  copyFile: (...args) => vol.copyFile(...args),
  existsSync: (...args) => vol.existsSync(...args),
  lstatSync: (...args) => vol.lstatSync(...args),
  mkdir: (...args) => vol.mkdir(...args),
  mkdirSync: (...args) => vol.mkdirSync(...args),
  readFile: (...args) => vol.readFile(...args),
  readFileSync: (...args) => vol.readFileSync(...args),
  readdir: (...args) => vol.readdir(...args),
  readdirSync: (...args) => vol.readdirSync(...args),
  statSync: (...args) => vol.statSync(...args),
  writeFile: (...args) => vol.writeFile(...args),
};
