import React from "react";
import { NativeModules, View } from "react-native";
import { Feature } from "./Feature";
import { getHermesVersion, isBridgeless } from "./core";
import { useStyles } from "./styles";

function isRemoteDebuggingAvailable(): boolean {
  return (
    !getHermesVersion() &&
    !isBridgeless() &&
    typeof NativeModules["DevSettings"]?.setIsDebuggingRemotely === "function"
  );
}

function setRemoteDebugging(value: boolean) {
  if (isRemoteDebuggingAvailable()) {
    NativeModules["DevSettings"].setIsDebuggingRemotely(value);
  }
}

// TODO: Remove this component when we drop support for <0.79
export function RemoteDebugging(): React.ReactElement | null {
  const styles = useStyles();

  if (!isRemoteDebuggingAvailable()) {
    return null;
  }

  // Remote debugging was removed in 0.79:
  // https://github.com/facebook/react-native/commit/9aae84a688b5af87faf4b68676b6357de26f797f
  try {
    const {
      isAsyncDebugging,
    } = require("react-native/Libraries/Utilities/DebugEnvironment");

    return (
      <View style={styles.group}>
        <Feature value={isAsyncDebugging} onValueChange={setRemoteDebugging}>
          Remote Debugging
        </Feature>
      </View>
    );
  } catch (_) {
    return null;
  }
}
