#!/usr/bin/env node
// @ts-check
"use strict";

const path = require("node:path");
const { readJSONFile } = require("./helpers");
const { generateSchema } = require("./schema");

const APP_JSON = "app.json";
const NODE_MODULES = "node_modules";

const BUILD_PROPS = [
  "$schema",
  "android",
  "ios",
  "macos",
  "windows",
  "plugins",
  "resources",
];

/**
 * Finds the specified file using Node module resolution.
 * @param {string} file
 * @param {string=} startDir
 * @returns {string | undefined}
 */
function findFile(file, startDir = process.cwd(), fs = require("node:fs")) {
  let currentDir = startDir;
  let candidate = path.join(currentDir, file);
  while (!fs.existsSync(candidate)) {
    const nextDir = path.dirname(currentDir);
    if (nextDir === currentDir) {
      return undefined;
    }

    currentDir = nextDir;
    candidate = path.join(currentDir, file);
  }

  return candidate;
}

function makeValidator() {
  const { default: Ajv } = require("ajv");
  const ajv = new Ajv({ allErrors: true });
  ajv.addKeyword({ keyword: "exclude-from-codegen" });
  ajv.addKeyword({ keyword: "markdownDescription" });
  return ajv;
}

/**
 * @param {import("node:fs").PathLike | undefined} manifestPath
 * @returns {Record<string, unknown> | number}
 */
function validateManifest(manifestPath, fs = require("node:fs")) {
  if (!manifestPath) {
    console.error(
      `Failed to find '${APP_JSON}'. Please make sure you're in the right directory.`
    );
    return 1;
  }

  const manifest = readJSONFile(manifestPath, fs);
  const validator = makeValidator();
  if (!validator.validate(generateSchema(), manifest)) {
    console.error(
      `${manifestPath}: error: ${APP_JSON} is not a valid app manifest`
    );
    const errors = validator.errors;
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
 * @param {string=} projectRoot Path to root of project
 */
function validate(
  outputMode = "stdout",
  projectRoot = process.cwd(),
  fs = require("node:fs")
) {
  const manifestPath = findFile(APP_JSON, projectRoot, fs);
  const manifest = validateManifest(manifestPath, fs);
  if (typeof manifest === "number") {
    process.exitCode = manifest;
    return;
  }

  const nodeModulesPath = findFile(NODE_MODULES, projectRoot, fs);
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
    const checksum = require("node:crypto")
      .createHash("sha256")
      .update(copy)
      .digest("hex");
    const cppHeader = [
      "// clang-format off",
      "#ifndef REACTTESTAPP_APP_JSON_H_",
      "#define REACTTESTAPP_APP_JSON_H_",
      "",
      `#define ReactTestApp_AppManifest "${escapedCopy}"`,
      `#define ReactTestApp_AppManifestChecksum "${checksum}"`,
      `#define ReactTestApp_AppManifestLength ${copy.length}`,
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
      const options = { recursive: true, mode: 0o755 };
      fs.mkdirSync(path.dirname(manifestCopyDest), options);
      fs.writeFileSync(manifestCopyDest, cppHeader);
    }
  } else {
    console.log(escapedCopy);
  }
}

exports.findFile = findFile;
exports.validate = validate;
exports.validateManifest = validateManifest;
