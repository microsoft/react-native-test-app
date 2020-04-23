/**
 * This cli config is needed for development purposes, e.g. for running
 * integration tests during local development or on CI services.
 */

const path = require("path");
const blacklist = require("metro-config/src/defaults/blacklist");

module.exports = {
  resolver: {
    extraNodeModules: {
      "react-native": path.resolve(
        __dirname,
        "node_modules/react-native-macos"
      ),
    },
    blacklistRE: blacklist([/node_modules\/react-native\/.*/]),
    platforms: ["macos", "ios", "android"],
  },
};
