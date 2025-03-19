// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { isObject, toPlist } from "./utils.mjs";

/** @import { ApplePlatform, JSONObject } from "../scripts/types.js"; */

const DEFAULT_IOS_ENTITLEMENTS = {
  "keychain-access-groups": ["$(AppIdentifierPrefix)com.microsoft.adalcache"],
};

const DEFAULT_MACOS_ENTITLEMENTS = {
  "com.apple.security.app-sandbox": true,
  "com.apple.security.files.user-selected.read-only": true,
  "com.apple.security.network.client": true,
};

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @returns {string | JSONObject | undefined}
 */
function getCodeSignEntitlements(appConfig, targetPlatform) {
  const platformConfig = appConfig[targetPlatform];
  if (!isObject(platformConfig)) {
    return;
  }

  const codeSignEntitlements = platformConfig["codeSignEntitlements"];
  if (
    typeof codeSignEntitlements !== "string" &&
    !isObject(codeSignEntitlements)
  ) {
    return;
  }

  return codeSignEntitlements;
}

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {string} destination
 * @returns {void}
 */
export function generateEntitlements(
  appConfig,
  targetPlatform,
  destination,
  fs = nodefs
) {
  // If `codeSignEntitlements` is a string, set `CODE_SIGN_ENTITLEMENTS` instead
  const userEntitlements = getCodeSignEntitlements(appConfig, targetPlatform);
  if (typeof userEntitlements === "string") {
    return;
  }

  const filename = "App.entitlements";
  const entitlements = toPlist(
    {
      ...(targetPlatform === "macos"
        ? DEFAULT_MACOS_ENTITLEMENTS
        : DEFAULT_IOS_ENTITLEMENTS),
      ...userEntitlements,
    },
    filename
  );

  fs.writeFileSync(path.join(destination, filename), entitlements);
}
