// @ts-check
/** @import { JSONObject } from "../scripts/types.ts"; */
import { v } from "../scripts/helpers.js";

/**
 * @param {number} reactNativeVersion
 */
function supportsNewArch(reactNativeVersion) {
  return reactNativeVersion === 0 || reactNativeVersion >= v(0, 71, 0);
}

/**
 * @param {JSONObject} options
 * @param {number} reactNativeVersion
 * @returns {boolean}
 */
export function isNewArchEnabled(options, reactNativeVersion) {
  if (!supportsNewArch(reactNativeVersion)) {
    return false;
  }

  const envVar = process.env["RCT_NEW_ARCH_ENABLED"];
  if (typeof envVar === "string") {
    return envVar !== "0";
  }

  if ("newArchEnabled" in options) {
    return Boolean(options["newArchEnabled"]);
  }

  if ("fabricEnabled" in options) {
    return Boolean(options["fabricEnabled"]);
  }

  // TODO: https://github.com/microsoft/react-native-test-app/issues/2321
  return false;
}

/**
 * @param {JSONObject} options
 * @param {number} reactNativeVersion
 * @returns {boolean}
 */
export function isBridgelessEnabled(options, reactNativeVersion) {
  if (isNewArchEnabled(options, reactNativeVersion)) {
    if (reactNativeVersion >= v(0, 74, 0)) {
      return options["bridgelessEnabled"] !== false;
    }
    if (reactNativeVersion >= v(0, 73, 0)) {
      return Boolean(options["bridgelessEnabled"]);
    }
  }
  return false;
}
