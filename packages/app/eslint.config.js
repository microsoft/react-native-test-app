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
];
