import { deepEqual, ok } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { generateAssetsCatalogs as generateAssetsCatalogsActual } from "../../ios/assetsCatalog.mjs";
import { readTextFile } from "../../scripts/helpers.js";
import { fs as fsMock, setMockFiles, toJSON } from "../fs.mock.ts";

const macosOnly = { skip: process.platform === "win32" };

describe("generateAssetsCatalogs()", macosOnly, () => {
  const projectRoot = ".";

  const generateAssetsCatalogs: typeof generateAssetsCatalogsActual = (
    appConfig,
    targetPlatform,
    destination
  ) =>
    generateAssetsCatalogsActual(
      appConfig,
      targetPlatform,
      destination,
      () => null,
      fsMock
    );

  afterEach(() => {
    setMockFiles();
  });

  for (const platform of ["ios", "macos"] as const) {
    const appiconsetCopyPath = path.resolve(
      projectRoot,
      "Assets.xcassets",
      "AppIcon.appiconset",
      "Contents.json"
    );
    const appiconsetTemplatePath = path.resolve(
      projectRoot,
      platform,
      "ReactTestApp",
      "Assets.xcassets",
      "AppIcon.appiconset",
      "Contents.json"
    );
    const appiconsetTemplate = readTextFile(appiconsetTemplatePath);

    it(`[${platform}] returns early if no icons are declared`, () => {
      setMockFiles({ [appiconsetTemplatePath]: appiconsetTemplate });

      generateAssetsCatalogs(configs.noConfig, platform, projectRoot);

      deepEqual(Object.keys(toJSON()), [
        appiconsetTemplatePath,
        appiconsetCopyPath,
      ]);

      generateAssetsCatalogs(configs.noIcons, platform, projectRoot);

      deepEqual(Object.keys(toJSON()), [
        appiconsetTemplatePath,
        appiconsetCopyPath,
      ]);
    });

    it(`[${platform}] returns early if primary icon is missing`, () => {
      setMockFiles({ [appiconsetTemplatePath]: appiconsetTemplate });

      generateAssetsCatalogs(
        configs.withAlternateIconsOnly,
        platform,
        projectRoot
      );

      deepEqual(Object.keys(toJSON()), [
        appiconsetTemplatePath,
        appiconsetCopyPath,
      ]);
    });

    it(`[${platform}] generates asset catalog for primary icon`, () => {
      setMockFiles({ [appiconsetTemplatePath]: appiconsetTemplate });

      generateAssetsCatalogs(configs.withPrimaryIcon, platform, projectRoot);

      const outputPath = path.resolve("AppIcon.appiconset", "Contents.json");
      const output = toJSON()[outputPath];

      ok(output);
      deepEqual(JSON.parse(output.toString()), snapshots.primary[platform]);
    });

    it(`[${platform}] generates asset catalog for all icons`, () => {
      setMockFiles({ [appiconsetTemplatePath]: appiconsetTemplate });

      generateAssetsCatalogs(configs.withAlternateIcons, platform, projectRoot);

      const iconSets = [
        [
          path.resolve("AppIcon.appiconset", "Contents.json"),
          snapshots.primary[platform],
        ],
        [
          path.resolve("AppIcon2.appiconset", "Contents.json"),
          snapshots.alternate[platform],
        ],
      ] as const;
      const vol = toJSON();

      for (const [iconset, expected] of iconSets) {
        const output = vol[iconset];

        ok(output);
        deepEqual(JSON.parse(output.toString()), expected);
      }
    });
  }
});

const configs = {
  noConfig: {
    name: "Example",
    ios: {},
  },
  noIcons: {
    name: "Example",
    ios: {
      icons: {},
    },
  },
  withPrimaryIcon: {
    [Symbol.for("source")]: fileURLToPath(import.meta.url),
    name: "Example",
    ios: {
      icons: {
        primaryIcon: {
          filename: "AppIcon.png",
          prerendered: true,
        },
      },
    },
    macos: {
      icons: {
        primaryIcon: {
          filename: "AppIcon.png",
          prerendered: true,
        },
      },
    },
  },
  withAlternateIcons: {
    [Symbol.for("source")]: fileURLToPath(import.meta.url),
    name: "Example",
    ios: {
      icons: {
        primaryIcon: {
          filename: "AppIcon.png",
          prerendered: true,
        },
        alternateIcons: {
          AppIcon2: {
            filename: "AppIcon2.png",
            prerendered: true,
          },
        },
      },
    },
    macos: {
      icons: {
        primaryIcon: {
          filename: "AppIcon.png",
          prerendered: true,
        },
        alternateIcons: {
          AppIcon2: {
            filename: "AppIcon2.png",
            prerendered: true,
          },
        },
      },
    },
  },
  withAlternateIconsOnly: {
    name: "Example",
    ios: {
      icons: {
        alternateIcons: {
          AppIcon2: {
            filename: "AppIcon2.png",
            prerendered: true,
          },
        },
      },
    },
    macos: {
      icons: {
        alternateIcons: {
          AppIcon2: {
            filename: "AppIcon2.png",
            prerendered: true,
          },
        },
      },
    },
  },
};

const snapshots = {
  primary: {
    ios: {
      images: [
        {
          filename: "AppIcon-20@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "20x20",
        },
        {
          filename: "AppIcon-20@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "20x20",
        },
        {
          filename: "AppIcon-29@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "29x29",
        },
        {
          filename: "AppIcon-29@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "29x29",
        },
        {
          filename: "AppIcon-40@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "40x40",
        },
        {
          filename: "AppIcon-40@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "40x40",
        },
        {
          filename: "AppIcon-60@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "60x60",
        },
        {
          filename: "AppIcon-60@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "60x60",
        },
        {
          filename: "AppIcon-20@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "20x20",
        },
        {
          filename: "AppIcon-20@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "20x20",
        },
        {
          filename: "AppIcon-29@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "29x29",
        },
        {
          filename: "AppIcon-29@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "29x29",
        },
        {
          filename: "AppIcon-40@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "40x40",
        },
        {
          filename: "AppIcon-40@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "40x40",
        },
        {
          filename: "AppIcon-76@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "76x76",
        },
        {
          filename: "AppIcon-76@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "76x76",
        },
        {
          filename: "AppIcon-83.5@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "83.5x83.5",
        },
        {
          filename: "AppIcon-1024@1x.png",
          idiom: "ios-marketing",
          scale: "1x",
          size: "1024x1024",
        },
      ],
      info: {
        author: "xcode",
        version: 1,
      },
    },
    macos: {
      images: [
        {
          filename: "AppIcon-16@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "16x16",
        },
        {
          filename: "AppIcon-16@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "16x16",
        },
        {
          filename: "AppIcon-32@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "32x32",
        },
        {
          filename: "AppIcon-32@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "32x32",
        },
        {
          filename: "AppIcon-128@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "128x128",
        },
        {
          filename: "AppIcon-128@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "128x128",
        },
        {
          filename: "AppIcon-256@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "256x256",
        },
        {
          filename: "AppIcon-256@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "256x256",
        },
        {
          filename: "AppIcon-512@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "512x512",
        },
        {
          filename: "AppIcon-512@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "512x512",
        },
      ],
      info: {
        author: "xcode",
        version: 1,
      },
    },
  },
  alternate: {
    ios: {
      images: [
        {
          filename: "AppIcon2-20@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "20x20",
        },
        {
          filename: "AppIcon2-20@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "20x20",
        },
        {
          filename: "AppIcon2-29@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "29x29",
        },
        {
          filename: "AppIcon2-29@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "29x29",
        },
        {
          filename: "AppIcon2-40@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "40x40",
        },
        {
          filename: "AppIcon2-40@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "40x40",
        },
        {
          filename: "AppIcon2-60@2x.png",
          idiom: "iphone",
          scale: "2x",
          size: "60x60",
        },
        {
          filename: "AppIcon2-60@3x.png",
          idiom: "iphone",
          scale: "3x",
          size: "60x60",
        },
        {
          filename: "AppIcon2-20@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "20x20",
        },
        {
          filename: "AppIcon2-20@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "20x20",
        },
        {
          filename: "AppIcon2-29@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "29x29",
        },
        {
          filename: "AppIcon2-29@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "29x29",
        },
        {
          filename: "AppIcon2-40@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "40x40",
        },
        {
          filename: "AppIcon2-40@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "40x40",
        },
        {
          filename: "AppIcon2-76@1x.png",
          idiom: "ipad",
          scale: "1x",
          size: "76x76",
        },
        {
          filename: "AppIcon2-76@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "76x76",
        },
        {
          filename: "AppIcon2-83.5@2x.png",
          idiom: "ipad",
          scale: "2x",
          size: "83.5x83.5",
        },
        {
          filename: "AppIcon2-1024@1x.png",
          idiom: "ios-marketing",
          scale: "1x",
          size: "1024x1024",
        },
      ],
      info: {
        author: "xcode",
        version: 1,
      },
    },
    macos: {
      images: [
        {
          filename: "AppIcon2-16@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "16x16",
        },
        {
          filename: "AppIcon2-16@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "16x16",
        },
        {
          filename: "AppIcon2-32@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "32x32",
        },
        {
          filename: "AppIcon2-32@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "32x32",
        },
        {
          filename: "AppIcon2-128@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "128x128",
        },
        {
          filename: "AppIcon2-128@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "128x128",
        },
        {
          filename: "AppIcon2-256@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "256x256",
        },
        {
          filename: "AppIcon2-256@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "256x256",
        },
        {
          filename: "AppIcon2-512@1x.png",
          idiom: "mac",
          scale: "1x",
          size: "512x512",
        },
        {
          filename: "AppIcon2-512@2x.png",
          idiom: "mac",
          scale: "2x",
          size: "512x512",
        },
      ],
      info: {
        author: "xcode",
        version: 1,
      },
    },
  },
};
