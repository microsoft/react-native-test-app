// @ts-check
import Ajv from "ajv";
import * as nodefs from "node:fs";
import { readJSONFile } from "../helpers.js";
import { generateSchema } from "../schema.js";

const APP_JSON = "app.json";

const BUILD_PROPS = [
  "$schema",
  "android",
  "ios",
  "macos",
  "windows",
  "plugins",
  "resources",
];

function makeValidator() {
  return new Ajv({ allErrors: true })
    .addKeyword({ keyword: "exclude-from-codegen" })
    .addKeyword({ keyword: "markdownDescription" });
}

/**
 * @param {import("node:fs").PathLike | undefined} manifestPath
 * @returns {Record<string, unknown> | number}
 */
export function validate(manifestPath, fs = nodefs) {
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
