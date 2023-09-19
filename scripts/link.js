// @ts-check

const path = require("node:path");

const localNodeModulesPath = path.join(process.cwd(), "node_modules");

/** @type {(module: NodeJS.Module) => void} */
module.exports = (module) => {
  if (!module.paths.includes(localNodeModulesPath)) {
    // Add the `node_modules` path whence the script was invoked. Without it,
    // this script will fail to resolve any packages when
    // `react-native-test-app` was linked using npm or yarn link.
    module.paths.push(localNodeModulesPath);
  }
};
