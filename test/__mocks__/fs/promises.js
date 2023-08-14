"use strict";

const fs = jest.createMockFromModule("fs/promises");

const { vol } = require("memfs");

fs.copyFile = (...args) => vol.promises.copyFile(...args);
fs.mkdir = (...args) => vol.promises.mkdir(...args);
fs.rm = (...args) => vol.promises.rm(...args);
fs.writeFile = (...args) => vol.promises.writeFile(...args);

module.exports = fs;
