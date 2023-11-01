const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...compat.extends(
    "plugin:@microsoft/sdl/required",
    "plugin:@rnx-kit/recommended"
  ),
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
];
