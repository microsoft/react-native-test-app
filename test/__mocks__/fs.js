"use strict";

const fs = jest.createMockFromModule("fs");

const { vol } = require("memfs");

/** @type {(newMockFiles: { [filename: string]: string }) => void} */
fs.__setMockFiles = (files) => {
  vol.reset();
  vol.fromJSON(files);
};

fs.__toJSON = () => vol.toJSON();

fs.copyFile = (...args) => vol.copyFile(...args);
fs.existsSync = (...args) => vol.existsSync(...args);
fs.lstat = (...args) => vol.lstat(...args);
fs.mkdir = (...args) => vol.mkdir(...args);
fs.readFile = (...args) => vol.readFile(...args);
fs.readFileSync = (...args) => vol.readFileSync(...args);
fs.readdirSync = (...args) => vol.readdirSync(...args);
fs.statSync = (...args) => vol.statSync(...args);
fs.unlink = (...args) => vol.unlink(...args);
fs.writeFile = (...args) => vol.writeFile(...args);

module.exports = fs;
