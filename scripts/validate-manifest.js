#!/usr/bin/env node
// @ts-check
"use strict";

const fs = require("fs");
const path = require("path");

const APP_JSON = "app.json";
const NODE_MODULES = "node_modules";

const BUILD_PROPS = [
  "$schema",
  "android",
  "ios",
  "macos",
  "windows",
  "resources",
];

/**
 * Finds the specified file using Node module resolution.
 * @param {string} file
 * @param {string=} startDir
 * @returns {string | undefined}
 */
function findFile(file, startDir = process.cwd()) {
  let candidate = path.join(startDir, file);
  while (!fs.existsSync(candidate)) {
    const cwd = path.dirname(candidate);
    const parent = path.dirname(cwd);
    if (parent === cwd) {
      return undefined;
    }

    candidate = path.join(parent, file);
  }
  return candidate;
}

function makeValidator() {
  const { default: Ajv, _ } = require("ajv");
  const ajv = new Ajv({ allErrors: true });
  ajv.addKeyword({
    keyword: "exclude-from-codegen",
    type: "object",
    schemaType: "boolean",
    code: (cxt) => {
      const { data, schema } = cxt;
      const op = schema ? _`!==` : _`===`;
      cxt.fail(_`${data} %2 ${op} 0`);
    },
  });
  ajv.addKeyword({ keyword: "markdownDescription" });
  return ajv.compile(require(`${__dirname}/../schema.json`));
}

/**
 * @param {fs.PathLike | undefined} manifestPath
 * @returns {Record<string, unknown> | number}
 */
function validateManifest(manifestPath) {
  if (!manifestPath) {
    console.error(
      `Failed to find '${APP_JSON}'. Please make sure you're in the right directory.`
    );
    return 1;
  }

  const content = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const manifest = /** @type {Record<string, unknown>} */ (JSON.parse(content));
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
    }
    return 1000 + (errors?.length ?? 0);
  }

  for (const key of BUILD_PROPS) {
    delete manifest[key];
  }

  return manifest;
}

/**
 * @param {("file" | "stdout")=} outputMode Whether to output to `file` or `stdout`
 */
function validate(outputMode = "stdout") {
  const manifestPath = findFile(APP_JSON);
  const manifest = validateManifest(manifestPath);
  if (typeof manifest === "number") {
    process.exitCode = manifest;
    return;
  }

  const nodeModulesPath = findFile(NODE_MODULES);
  if (!nodeModulesPath) {
    console.error(
      `Failed to find '${NODE_MODULES}'. Please make sure you've installed npm dependencies.`
    );
    process.exitCode = 2;
    return;
  }

  const copy = JSON.stringify(manifest);
  const escapedCopy = copy.replace(/["]/g, '\\"');

  if (outputMode === "file") {
    const checksum = require("crypto")
      .createHash("sha256")
      .update(copy)
      .digest("hex");
    const cppHeader = [
      "// clang-format off",
      "#ifndef REACTTESTAPP_APP_JSON_H_",
      "#define REACTTESTAPP_APP_JSON_H_",
      "",
      `const char* const ReactTestApp_AppManifest = "${escapedCopy}";`,
      `const char* const ReactTestApp_AppManifestChecksum = "${checksum}";`,
      `const size_t ReactTestApp_AppManifestLength = ${copy.length};`,
      "",
      "#endif  // REACTTESTAPP_APP_JSON_H_",
      "",
    ].join("\n");
    const manifestCopyDest = path.join(
      nodeModulesPath,
      ".generated",
      APP_JSON + ".h"
    );

    if (
      !fs.existsSync(manifestCopyDest) ||
      cppHeader !== fs.readFileSync(manifestCopyDest, { encoding: "utf-8" })
    ) {
      fs.mkdirSync(path.dirname(manifestCopyDest), {
        recursive: true,
        mode: 0o755,
      });
      fs.writeFileSync(manifestCopyDest, cppHeader);
    }
  } else {
    console.log(escapedCopy);
  }
}

exports.findFile = findFile;
exports.validate = validate;
exports.validateManifest = validateManifest;

if (require.main === module) {
  // istanbul ignore next
  validate();
}
