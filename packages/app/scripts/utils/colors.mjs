// @ts-check
import { styleText } from "node:util";

/** @typedef {(text: string) => string} Color */

// Force disable colors in test environments
if (process.env["NODE_TEST_CONTEXT"] || process.env["NODE_ENV"] === "test") {
  process.env["FORCE_COLOR"] = "0";
}

export const infoTag = styleText(["cyan", "bold"], "info");
export const warnTag = styleText(["yellow", "bold"], "warn");

/** @type {Color} */
export const bold = (text) => styleText("bold", text);
/** @type {Color} */
export const red = (text) => styleText("red", text);
/** @type {Color} */
export const green = (text) => styleText("green", text);
/** @type {Color} */
export const yellow = (text) => styleText("yellow", text);
