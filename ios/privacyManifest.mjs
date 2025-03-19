// @ts-check
import * as nodefs from "node:fs";
import * as path from "node:path";
import { isObject, toPlist } from "./utils.mjs";

/**
 * @import { ApplePlatform, JSONObject, JSONValue } from "../scripts/types.js";
 *
 * @typedef {{
 *   NSPrivacyTracking: boolean;
 *   NSPrivacyTrackingDomains: JSONValue[];
 *   NSPrivacyCollectedDataTypes: JSONValue[];
 *   NSPrivacyAccessedAPITypes: JSONValue[];
 * }} PrivacyManifest;
 */

// https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
export const PRIVACY_ACCESSED_API_TYPES = "NSPrivacyAccessedAPITypes";
export const PRIVACY_COLLECTED_DATA_TYPES = "NSPrivacyCollectedDataTypes";
export const PRIVACY_TRACKING = "NSPrivacyTracking";
export const PRIVACY_TRACKING_DOMAINS = "NSPrivacyTrackingDomains";

// https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
export const PRIVACY_ACCESSED_API_TYPE = "NSPrivacyAccessedAPIType";
export const PRIVACY_ACCESSED_API_TYPE_REASONS =
  "NSPrivacyAccessedAPITypeReasons";
export const PRIVACY_ACCESSED_API_CATEGORY_FILE_TIMESTAMP =
  "NSPrivacyAccessedAPICategoryFileTimestamp";
export const PRIVACY_ACCESSED_API_CATEGORY_SYSTEM_BOOT_TIME =
  "NSPrivacyAccessedAPICategorySystemBootTime";
export const PRIVACY_ACCESSED_API_CATEGORY_USER_DEFAULTS =
  "NSPrivacyAccessedAPICategoryUserDefaults";

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @returns {JSONObject | undefined}
 */
function getUserPrivacyManifest(appConfig, targetPlatform) {
  const platformConfig = appConfig[targetPlatform];
  if (!isObject(platformConfig)) {
    return;
  }

  const userPrivacyManifest = platformConfig["privacyManifest"];
  if (!isObject(userPrivacyManifest)) {
    return;
  }

  return userPrivacyManifest;
}

/**
 * @param {JSONObject} appConfig
 * @param {ApplePlatform} targetPlatform
 * @param {string} destination
 * @returns {Promise<void>}
 */
export async function generatePrivacyManifest(
  appConfig,
  targetPlatform,
  destination,
  fs = nodefs
) {
  /** @type {PrivacyManifest} */
  const manifest = {
    [PRIVACY_TRACKING]: false,
    [PRIVACY_TRACKING_DOMAINS]: [],
    [PRIVACY_COLLECTED_DATA_TYPES]: [],
    [PRIVACY_ACCESSED_API_TYPES]: [
      {
        [PRIVACY_ACCESSED_API_TYPE]:
          PRIVACY_ACCESSED_API_CATEGORY_FILE_TIMESTAMP,
        [PRIVACY_ACCESSED_API_TYPE_REASONS]: ["C617.1"],
      },
      {
        [PRIVACY_ACCESSED_API_TYPE]:
          PRIVACY_ACCESSED_API_CATEGORY_SYSTEM_BOOT_TIME,
        [PRIVACY_ACCESSED_API_TYPE_REASONS]: ["35F9.1"],
      },
      {
        [PRIVACY_ACCESSED_API_TYPE]:
          PRIVACY_ACCESSED_API_CATEGORY_USER_DEFAULTS,
        [PRIVACY_ACCESSED_API_TYPE_REASONS]: ["CA92.1"],
      },
    ],
  };

  const userPrivacyManifest = getUserPrivacyManifest(appConfig, targetPlatform);
  if (userPrivacyManifest) {
    const tracking = userPrivacyManifest[PRIVACY_TRACKING];
    if (typeof tracking === "boolean") {
      manifest[PRIVACY_TRACKING] = tracking;
    }

    const fields = /** @type {const} */ ([
      PRIVACY_TRACKING_DOMAINS,
      PRIVACY_COLLECTED_DATA_TYPES,
      PRIVACY_ACCESSED_API_TYPES,
    ]);
    for (const field of fields) {
      const value = userPrivacyManifest[field];
      if (Array.isArray(value)) {
        manifest[field].push(...value);
      }
    }
  }

  const xcprivacy = await toPlist(manifest);
  fs.writeFileSync(path.join(destination, "PrivacyInfo.xcprivacy"), xcprivacy);
}
