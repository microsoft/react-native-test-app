"use strict";

const fs = jest.createMockFromModule("fs/promises");

const { vol } = require("memfs");

fs.rm = (...args) => vol.promises.rm(...args);

module.exports = fs;
