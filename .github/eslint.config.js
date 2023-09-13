module.exports = {
  extends: [
    "plugin:@microsoft/sdl/required",
    "plugin:@rnx-kit/recommended",
    "plugin:jest/recommended",
    "plugin:jest/style",
  ],
  rules: {
    "jest/no-standalone-expect": [
      "error",
      {
        additionalTestBlockFunctions: ["testIf"],
      },
    ],
  },
  ignorePatterns: ["!.yarn"],
};
