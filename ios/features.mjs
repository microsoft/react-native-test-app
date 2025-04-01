// @ts-check
/** @import { ApplePlatform, JSONObject } from "../scripts/types.ts"; */
import { v } from "../scripts/helpers.js";

/**
 * @param {number} reactNativeVersion
 */
function supportsNewArch(reactNativeVersion) {
  return reactNativeVersion === 0 || reactNativeVersion >= v(0, 71, 0);
}

/**
 * @param {number} reactNativeVersion
 * @param {JSONObject} options
 * @returns {boolean}
 */
export function isNewArchEnabled(reactNativeVersion, options) {
  if (!supportsNewArch(reactNativeVersion)) {
    return false;
  }

  const newArchEnabled = process.env["RCT_NEW_ARCH_ENABLED"];
  if (typeof newArchEnabled === "string") {
    return newArchEnabled !== "0";
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
 * @param {number} reactNativeVersion
 * @param {JSONObject} options
 * @returns {boolean}
 */
export function isBridgelessEnabled(reactNativeVersion, options) {
  if (isNewArchEnabled(reactNativeVersion, options)) {
    if (reactNativeVersion >= v(0, 74, 0)) {
      return options["bridgelessEnabled"] !== false;
    }
    if (reactNativeVersion >= v(0, 73, 0)) {
      return Boolean(options["bridgelessEnabled"]);
    }
  }
  return false;
}

/**
 * @param {ApplePlatform} platform
 * @param {number} reactNativeVersion
 * @param {JSONObject} options
 * @returns {boolean | "from-source"}
 */
export function isHermesEnabled(platform, reactNativeVersion, options) {
  const useHermes = process.env["USE_HERMES"];
  const enabled =
    typeof useHermes === "string"
      ? useHermes === "1"
      : options["hermesEnabled"] === true;

  // Hermes prebuilds for visionOS was introduced in 0.76
  if (enabled && platform === "visionos" && reactNativeVersion < v(0, 76, 0)) {
    return "from-source";
  }

  return enabled;
}
