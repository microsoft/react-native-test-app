import { deepEqual } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { generatePrivacyManifest as generatePrivacyManifestActual } from "../../ios/privacyManifest.mjs";
import type { JSONObject } from "../../scripts/types.ts";
import { fs, setMockFiles } from "../fs.mock.ts";

const macosOnly = { skip: process.platform === "win32" };

describe("generatePrivacyManifest()", macosOnly, () => {
  function generatePrivacyManifest(config: JSONObject): void {
    const destination = ".";
    fs.mkdirSync(destination, { recursive: true, mode: 0o755 });
    generatePrivacyManifestActual(config, "ios", destination, fs);
  }

  function readPrivacyManifest() {
    return fs
      .readFileSync("PrivacyInfo.xcprivacy", { encoding: "utf-8" })
      .split("\n");
  }

  afterEach(() => {
    setMockFiles();
  });

  it("generates a default manifest", () => {
    generatePrivacyManifest({});

    deepEqual(readPrivacyManifest(), DEFAULT_PRIVACY_MANIFEST);
  });

  it("handles invalid configuration", () => {
    generatePrivacyManifest({ ios: { privacyManifest: "YES" } });

    deepEqual(readPrivacyManifest(), DEFAULT_PRIVACY_MANIFEST);
  });

  it("appends to default manifest", () => {
    generatePrivacyManifest({
      ios: {
        privacyManifest: {
          NSPrivacyTracking: true,
          NSPrivacyTrackingDomains: ["test"],
          NSPrivacyAccessedAPITypes: ["test"],
        },
      },
    });

    deepEqual(readPrivacyManifest(), [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
      '<plist version="1.0">',
      "<dict>",
      "	<key>NSPrivacyAccessedAPITypes</key>",
      "	<array>",
      "		<dict>",
      "			<key>NSPrivacyAccessedAPIType</key>",
      "			<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>",
      "			<key>NSPrivacyAccessedAPITypeReasons</key>",
      "			<array>",
      "				<string>C617.1</string>",
      "			</array>",
      "		</dict>",
      "		<dict>",
      "			<key>NSPrivacyAccessedAPIType</key>",
      "			<string>NSPrivacyAccessedAPICategorySystemBootTime</string>",
      "			<key>NSPrivacyAccessedAPITypeReasons</key>",
      "			<array>",
      "				<string>35F9.1</string>",
      "			</array>",
      "		</dict>",
      "		<dict>",
      "			<key>NSPrivacyAccessedAPIType</key>",
      "			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>",
      "			<key>NSPrivacyAccessedAPITypeReasons</key>",
      "			<array>",
      "				<string>CA92.1</string>",
      "			</array>",
      "		</dict>",
      "		<string>test</string>",
      "	</array>",
      "	<key>NSPrivacyCollectedDataTypes</key>",
      "	<array/>",
      "	<key>NSPrivacyTracking</key>",
      "	<true/>",
      "	<key>NSPrivacyTrackingDomains</key>",
      "	<array>",
      "		<string>test</string>",
      "	</array>",
      "</dict>",
      "</plist>",
      "",
    ]);
  });
});

const DEFAULT_PRIVACY_MANIFEST = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
  '<plist version="1.0">',
  "<dict>",
  "	<key>NSPrivacyAccessedAPITypes</key>",
  "	<array>",
  "		<dict>",
  "			<key>NSPrivacyAccessedAPIType</key>",
  "			<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>",
  "			<key>NSPrivacyAccessedAPITypeReasons</key>",
  "			<array>",
  "				<string>C617.1</string>",
  "			</array>",
  "		</dict>",
  "		<dict>",
  "			<key>NSPrivacyAccessedAPIType</key>",
  "			<string>NSPrivacyAccessedAPICategorySystemBootTime</string>",
  "			<key>NSPrivacyAccessedAPITypeReasons</key>",
  "			<array>",
  "				<string>35F9.1</string>",
  "			</array>",
  "		</dict>",
  "		<dict>",
  "			<key>NSPrivacyAccessedAPIType</key>",
  "			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>",
  "			<key>NSPrivacyAccessedAPITypeReasons</key>",
  "			<array>",
  "				<string>CA92.1</string>",
  "			</array>",
  "		</dict>",
  "	</array>",
  "	<key>NSPrivacyCollectedDataTypes</key>",
  "	<array/>",
  "	<key>NSPrivacyTracking</key>",
  "	<false/>",
  "	<key>NSPrivacyTrackingDomains</key>",
  "	<array/>",
  "</dict>",
  "</plist>",
  "",
];
