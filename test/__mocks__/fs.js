//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
"use strict";

/**
 * @typedef {import('fs').NoParamCallback} NoParamCallback
 * @typedef {import('fs').PathLike} PathLike
 * @typedef {import('fs').Stats} Stats
 * @typedef {import('fs').WriteFileOptions} WriteFileOptions
 */
const fs = jest.createMockFromModule("fs");

/** @type {{ [filename: string]: string } | undefined} */
let mockFiles = undefined;

/** @type {(newMockFiles: { [filename: string]: string }) => void} */
fs.__setMockFiles = (newMockFiles) => {
  mockFiles = Object.create(null);
  for (const path in newMockFiles) {
    mockFiles[path] = newMockFiles[path];
  }
};

/** @type {(src: PathLike, dest: PathLike, callback: NoParamCallback) => void} */
fs.copyFile = (src, dest, callback) => {
  if (!dest) {
    callback("copyFile() error");
  } else {
    mockFiles[dest] = mockFiles[src];
    callback(undefined);
  }
};

/** @type {(path: PathLike | number) => boolean} */
fs.existsSync = (path) =>
  mockFiles ? path in mockFiles : jest.requireActual("fs").existsSync(path);

/** @type {(path: PathLike | number) => string} */
fs.readFileSync = (path) => mockFiles[path];

/** @type {(path: PathLike) => Stats} */
fs.statSync = (path) => ({
  isDirectory: () => mockFiles[path] === "directory",
  mode: 644,
});

/** @type {(path: PathLike | number, data: string, options: WriteFileOptions, callback: NoParamCallback) => void} */
fs.writeFile = (path, data, options, callback) => {
  if (!path) {
    callback("writeFile() error");
  } else {
    mockFiles[path] = data;
    callback(undefined);
  }
};

module.exports = fs;
