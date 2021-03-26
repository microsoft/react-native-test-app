//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
"use strict";

/**
 * @typedef {import("fs").MakeDirectoryOptions} MakeDirectoryOptions
 * @typedef {import("fs").NoParamCallback} NoParamCallback
 * @typedef {import("fs").PathLike} PathLike
 * @typedef {import("fs").Stats} Stats
 * @typedef {import("fs").WriteFileOptions} WriteFileOptions
 */
const fs = jest.createMockFromModule("fs");

/** @type {{ [filename: string]: string } | undefined} */
let mockFiles = Object.create(null);

/** @type {(newMockFiles: { [filename: string]: string }) => void} */
fs.__setMockFiles = (newMockFiles) => {
  mockFiles = Object.create(null);
  for (const path in newMockFiles) {
    mockFiles[path] = newMockFiles[path];
  }
};

/** @type {(src: PathLike, dest: PathLike, callback: NoParamCallback) => void} */
fs.copyFile = (src, dest, callback) => {
  if (!(src in mockFiles) || !dest) {
    callback(new Error("copyFile() error"));
  } else {
    mockFiles[dest] = mockFiles[src];
    callback(null);
  }
};

/** @type {(path: PathLike | number) => boolean} */
fs.existsSync = (path) =>
  mockFiles ? path in mockFiles : jest.requireActual("fs").existsSync(path);

/** @type {(path: PathLike | number, callback: NoParamCallback) => void} */
fs.lstat = (path, callback) => callback();

/** @type {(path: PathLike | number, options: NoParamCallback, callback: NoParamCallback) => void} */
fs.mkdir = (path, options, callback) => callback();

/** @type {(path: PathLike | number) => string} */
fs.readFileSync = (path) => mockFiles[path];

/** @type {(path: PathLike) => Stats} */
fs.statSync = (path) => ({
  isDirectory: () => mockFiles[path] === "directory",
  mode: 644,
});

/** @type {(path: PathLike | number, callback: NoParamCallback) => void} */
fs.unlink = (path, callback) => {
  if (path in mockFiles) {
    delete mockFiles[path];
    callback(null);
  } else {
    const error = new Error(`no such file or directory, unlink '${path}'`);
    error.code = "ENOENT";
    callback(error);
  }
};

/** @type {(path: PathLike | number, data: string, optionsOrCallback: WriteFileOptions | NoParamCallback, callback: NoParamCallback) => void} */
fs.writeFile = (
  path,
  data,
  optionsOrCallback,
  callback = optionsOrCallback
) => {
  if (!path || path === ".") {
    callback(new Error("writeFile() error"));
  } else {
    mockFiles[path] = data;
    callback(null);
  }
};

module.exports = fs;
