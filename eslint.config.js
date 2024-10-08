const sdl = require("@microsoft/eslint-plugin-sdl");
const rnx = require("@rnx-kit/eslint-plugin");
const wdio = require("eslint-plugin-wdio");

module.exports = [
  ...sdl.configs.recommended,
  wdio.configs["flat/recommended"],
  ...rnx.configs.strict,
  {
    ignores: ["!.yarn"],
    plugins: {
      local: require("./scripts/eslint/plugin"),
    },
    rules: {
      "local/no-process-exit": "error",
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
  {
    files: [
      "scripts/internal/generate-manifest-docs.mjs",
      "scripts/internal/generate-manifest.mjs",
      "scripts/internal/generate-schema.mjs",
      "scripts/internal/pack.mjs",
      "scripts/internal/set-react-version.mjs",
      "scripts/internal/test.mjs",
      "scripts/schema.mjs",
      "scripts/testing/test-apple.mjs",
      "scripts/testing/test-e2e.mjs",
      "scripts/testing/test-matrix.mjs",
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
];
