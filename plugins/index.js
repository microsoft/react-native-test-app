const { withMod } = require("@expo/config-plugins");

function withBridgeDelegate(config, action) {
  return withMod(config, {
    platform: "ios",
    mod: "bridgeDelegate",
    action,
  });
}

function withSceneDelegate(config, action) {
  return withMod(config, {
    platform: "ios",
    mod: "sceneDelegate",
    action,
  });
}

exports.withBridgeDelegate = withBridgeDelegate;
exports.withSceneDelegate = withSceneDelegate;
