// @ts-check
// istanbul ignore file
"use strict";

jest.mock("fs");

const fs = require("fs");

/**
 * Adds mock files.
 * @param {Record<string, string>} files
 */
function mockFiles(files = {}) {
  // @ts-expect-error for mocking purposes only
  fs.__setMockFiles(files);
}

exports.mockFiles = mockFiles;
