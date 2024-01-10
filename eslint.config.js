const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const rnx = require("@rnx-kit/eslint-plugin");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    plugins: {
      wdio: require("eslint-plugin-wdio"),
    },
  },
  ...compat.extends(
    "plugin:@microsoft/sdl/required",
    "plugin:wdio/recommended"
  ),
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
      "scripts/set-react-version.mjs",
      "scripts/test-e2e.mjs",
      "scripts/test-matrix.mjs",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["[a-z]*", "!./*", "!node:*"],
              message:
                "External dependencies are not allowed in this file because it needs to be runnable before install.",
            },
          ],
        },
      ],
    },
  },
];
