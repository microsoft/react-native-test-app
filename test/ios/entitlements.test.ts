import { deepEqual, throws } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { generateEntitlements as generateEntitlementsActual } from "../../ios/entitlements.mjs";
import type { JSONObject } from "../../scripts/types.ts";
import { fs, setMockFiles } from "../fs.mock.ts";

const macosOnly = { skip: process.platform === "win32" };

describe("generatePrivacyManifest()", macosOnly, () => {
  const targetPlatforms = ["ios", "macos", "visionos"] as const;

  function generateEntitlements(
    config: JSONObject,
    platform: (typeof targetPlatforms)[number]
  ): void {
    const destination = ".";
    fs.mkdirSync(destination, { recursive: true, mode: 0o755 });
    generateEntitlementsActual(config, platform, destination, fs);
  }

  function readEntitlements() {
    return fs
      .readFileSync("App.entitlements", { encoding: "utf-8" })
      .split("\n");
  }

  afterEach(() => {
    setMockFiles();
  });

  for (const platform of targetPlatforms) {
    it(`[${platform}] generates a default manifest`, () => {
      generateEntitlements({}, platform);

      deepEqual(readEntitlements(), DEFAULT_ENTITLEMENTS[platform]);
    });

    it(`[${platform}] handles invalid manifest`, () => {
      generateEntitlements(
        { [platform]: { codeSignEntitlements: false } },
        platform
      );

      deepEqual(readEntitlements(), DEFAULT_ENTITLEMENTS[platform]);
    });

    it(`[${platform}] does not generate a manifest when a path is specified`, () => {
      generateEntitlements(
        { [platform]: { codeSignEntitlements: "App.entitlements" } },
        platform
      );

      throws(readEntitlements);
    });

    it(`[${platform}] appends to default manifest`, () => {
      generateEntitlements(
        {
          [platform]: {
            codeSignEntitlements: {
              "com.apple.developer.game-center": true,
            },
          },
        },
        platform
      );

      deepEqual(readEntitlements(), APP_ENTITLEMENTS[platform]);
    });
  }
});

const DEFAULT_ENTITLEMENTS = {
  ios: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "	<key>keychain-access-groups</key>",
    "	<array>",
    "		<string>$(AppIdentifierPrefix)com.microsoft.adalcache</string>",
    "	</array>",
    "</dict>",
    "</plist>",
    "",
  ],
  macos: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "	<key>com.apple.security.app-sandbox</key>",
    "	<true/>",
    "	<key>com.apple.security.files.user-selected.read-only</key>",
    "	<true/>",
    "	<key>com.apple.security.network.client</key>",
    "	<true/>",
    "</dict>",
    "</plist>",
    "",
  ],
  visionos: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "	<key>keychain-access-groups</key>",
    "	<array>",
    "		<string>$(AppIdentifierPrefix)com.microsoft.adalcache</string>",
    "	</array>",
    "</dict>",
    "</plist>",
    "",
  ],
};

const APP_ENTITLEMENTS = {
  ios: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "	<key>com.apple.developer.game-center</key>",
    "	<true/>",
    "	<key>keychain-access-groups</key>",
    "	<array>",
    "		<string>$(AppIdentifierPrefix)com.microsoft.adalcache</string>",
    "	</array>",
    "</dict>",
    "</plist>",
    "",
  ],
  macos: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "	<key>com.apple.developer.game-center</key>",
    "	<true/>",
    "	<key>com.apple.security.app-sandbox</key>",
    "	<true/>",
    "	<key>com.apple.security.files.user-selected.read-only</key>",
    "	<true/>",
    "	<key>com.apple.security.network.client</key>",
    "	<true/>",
    "</dict>",
    "</plist>",
    "",
  ],
  visionos: [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "	<key>com.apple.developer.game-center</key>",
    "	<true/>",
    "	<key>keychain-access-groups</key>",
    "	<array>",
    "		<string>$(AppIdentifierPrefix)com.microsoft.adalcache</string>",
    "	</array>",
    "</dict>",
    "</plist>",
    "",
  ],
};
