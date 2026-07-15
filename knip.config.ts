const appEntry = ["index.ts", "metro.config.js", "test/**/*.mjs"];

function exampleFor(platformPackage: string) {
  return {
    entry: appEntry,
    ignore: ["babel.config.js"], // Knip doesn't understand pnpm layout?
    ignoreDependencies: [
      "@babel/preset-env",
      "@react-native-webapis/web-storage",
      "react-native-safe-area-context",
      "react-native-test-app",
      platformPackage,
    ],
  };
}

/* oxlint-disable-next-line import/no-default-export */
export default {
  ignore: [".github/actions/*/action.yml", ".github/workflows/*.yml"],
  ignoreBinaries: [
    "clang-format",
    "ktlint",
    "sips",
    "swiftformat",
    "swiftlint",
    "tail",
    "xcrun",
  ],
  metro: false,
  workspaces: {
    ".": {
      entry: ["scripts/*.js", "scripts/*.ts"],
      ignore: ["oxlint.config.ts"], // Knip doesn't understand pnpm layout?
      ignoreDependencies: ["@nx/js", "@yarnpkg/*"],
    },
    "packages/app": {
      entry: [
        "*/template.config.mjs",
        "android/gradle-wrapper.js",
        "scripts/config-plugins/types.ts", // Knip does not yet parse @import tags
        "ios/app.mjs",
        "plugins/*.js",
        "scripts/apply-config-plugins.mjs",
        "scripts/config-plugins/index.mjs",
        "scripts/internal/prepare-viewfinder.mts",
        "scripts/types.ts", // Knip does not yet parse @import tags
      ],
      ignoreDependencies: [
        "@babel/core",
        "@babel/preset-env",
        "@react-native-community/template",
      ],
    },
    "packages/app/example": {
      entry: appEntry,
      ignore: ["babel.config.js"], // Knip doesn't understand pnpm layout?
      ignoreDependencies: [
        "@babel/preset-env",
        "@react-native-webapis/web-storage",
        "@rnx-kit/react-native-template-web",
        "@wdio/types",
        "appium",
        "appium-uiautomator2-driver",
        "appium-xcuitest-driver",
      ],
    },
    "packages/example-macos": exampleFor("react-native-macos"),
    "packages/example-visionos": exampleFor(
      "@react-native-community/cli-platform-apple"
    ),
    "packages/example-windows": exampleFor("react-native-windows"),
  },
};
