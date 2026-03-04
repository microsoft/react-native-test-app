import sdl from "@rnx-kit/oxlint-config/sdl-node";
import strict from "@rnx-kit/oxlint-config/strict";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [sdl, strict],
  plugins: ["import", "unicorn"],
  jsPlugins: [
    {
      name: "wdio",
      specifier: import.meta.resolve("eslint-plugin-wdio"),
    },
  ],
  rules: {
    "import/no-default-export": "error",
    "unicorn/no-process-exit": "error",
    "wdio/await-expect": "error",
    "wdio/no-debug": "error",
    "wdio/no-pause": "error",
  },
  overrides: [
    {
      files: ["oxlint.config.ts"],
      rules: {
        "import/no-default-export": "off",
      },
    },
    {
      files: [
        "scripts/internal/generate-manifest-docs.mts",
        "scripts/internal/generate-manifest.mts",
        "scripts/internal/generate-schema.mts",
        "scripts/internal/pack.mts",
        "scripts/internal/set-react-version.mts",
        "scripts/internal/test.mts",
        "scripts/schema.mjs",
        "scripts/testing/test-apple.mts",
        "scripts/testing/test-e2e.mts",
        "scripts/testing/test-matrix.mts",
        "scripts/utils/colors.mjs",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["[a-z]*", "!../**", "!./**", "!node:*", "!node:*/**"],
                message:
                  "External dependencies are not allowed in this file because it needs to be runnable before install.",
              },
            ],
          },
        ],
      },
    },
  ],
});
