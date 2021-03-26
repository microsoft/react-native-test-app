//
// Copyright (c) Microsoft Corporation
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check
// istanbul ignore file

jest.mock("fs");

const fs = require("fs");

/**
 * Adds mock files.
 * @param {...[string, unknown]} files
 */
function mockFiles(...files) {
  // @ts-ignore `__setMockFiles`
  fs.__setMockFiles(
    Object.fromEntries(
      files.map(([filename, content]) => [filename, JSON.stringify(content)])
    )
  );
}

exports.mockFiles = mockFiles;
