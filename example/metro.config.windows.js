/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */
const fs = require("fs");
const path = require("path");

const exclusionList = (() => {
  try {
    return require("metro-config/src/defaults/exclusionList");
  } catch (_) {
    // `blacklist` was renamed to `exclusionList` in 0.60
    return require("metro-config/src/defaults/blacklist");
  }
})();

const rnPath = fs.realpathSync(
  path.resolve(require.resolve("react-native/package.json"))
);
const rnwPath = fs.realpathSync(
  path.resolve(require.resolve("react-native-windows/package.json"))
);

const blockList = exclusionList([
  // Since there are multiple copies of react-native, we need to ensure that
  // Metro only sees one of them. This should go when haste-map is removed.
  new RegExp(`${(path.resolve(rnPath) + path.sep).replace(/[/\\]/g, "/")}.*`),

  // This stops "react-native run-windows" from causing the metro server to
  // crash if its already running
  new RegExp(`${path.resolve(__dirname, "windows").replace(/[/\\]/g, "/")}.*`),

  // Workaround for `EBUSY: resource busy or locked, open
  // '~\msbuild.ProjectImports.zip'` when building with `yarn windows --release`
  /.*\.ProjectImports\.zip/,
]);

module.exports = {
  resolver: {
    extraNodeModules: {
      // Redirect react-native to react-native-windows
      "react-native": rnwPath,
      "react-native-windows": rnwPath,
    },
    platforms: ["windesktop", "windows"],
    blacklistRE: blockList,
    blockList,
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
};
