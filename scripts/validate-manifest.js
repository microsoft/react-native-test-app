#!/usr/bin/env node
// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");

const APP_JSON = "app.json";

/**
 * Finds the app manifest.
 * @param {string=} cwd
 * @returns {string | undefined}
 */
function findAppManifest(cwd = process.cwd()) {
  const candidate = path.join(cwd, APP_JSON);
  if (fs.existsSync(candidate)) {
    return candidate;
  }

  const parent = path.dirname(cwd);
  if (parent === cwd) {
    return undefined;
  }

  return findAppManifest(parent);
}

function makeValidator() {
  const { default: Ajv } = require("ajv");
  const ajv = new Ajv({ allErrors: true });
  return ajv.compile(require(`${__dirname}/../schema.json`));
}

function validateManifest(manifestPath = findAppManifest()) {
  if (!manifestPath) {
    console.error(
      `Failed to find '${APP_JSON}'. Please make sure you're in the right directory.`
    );
    process.exit(1);
  }

  const content = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const manifest = JSON.parse(content);
  const validate = makeValidator();
  if (!validate(manifest)) {
    console.error(
      `${manifestPath}: error: ${APP_JSON} is not a valid app manifest`
    );
    const errors = validate.errors;
    if (errors) {
      errors.map(({ instancePath, message }) =>
        console.error(
          `${manifestPath}: error: ${instancePath || "<root>"} ${message}`
        )
      );
      process.exit(1);
    }
  }
}

exports.findAppManifest = findAppManifest;
exports.validateManifest = validateManifest;

if (require.main === module) {
  // istanbul ignore next
  validateManifest();
}
