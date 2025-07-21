import type { NativeSyntheticEvent } from "react-native";
import { NativeModules } from "react-native";

export type ReactNativeVersion = {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  getVersionString: () => string;
};

export const ReactNativeVersion: ReactNativeVersion = (() => {
  // https://github.com/facebook/react-native/commit/ec5638abd0e872be62b6ea5d8df9bed6335c2191
  const { ReactNativeVersion } = require("react-native");
  if (ReactNativeVersion) {
    return ReactNativeVersion;
  }

  const { version } = require("react-native/Libraries/Core/ReactNativeVersion");
  return {
    ...version,
    getVersionString: () => {
      const { major, minor, patch, prerelease } = version;
      const v = `${major}.${minor}.${patch}`;
      return prerelease ? `${v}-${prerelease.replace("-", "\n")}` : v;
    },
  };
})();

export function getHermesVersion(): string | undefined {
  const version =
    "HermesInternal" in global &&
    HermesInternal &&
    "getRuntimeProperties" in HermesInternal &&
    typeof HermesInternal.getRuntimeProperties === "function" &&
    HermesInternal.getRuntimeProperties()["OSS Release Version"];
  if (!version) {
    return undefined;
  }

  return `Hermes ${version}`;
}

export function isBridgeless() {
  return "RN$Bridgeless" in global && RN$Bridgeless === true;
}

export function isConcurrentReactEnabled(
  props: { concurrentRoot?: boolean },
  isFabric: boolean
): boolean {
  const { major, minor } = ReactNativeVersion;
  const version = major * 10000 + minor;
  // As of 0.74, it won't be possible to opt-out:
  // https://github.com/facebook/react-native/commit/30d186c3683228d4fb7a42f804eb2fdfa7c8ac03
  return isFabric && (version >= 74 || props.concurrentRoot !== false);
}

export function isFabricInstance<T>(
  ref: NativeSyntheticEvent<T>["currentTarget"]
): boolean {
  return Boolean(
    // @ts-expect-error — https://github.com/facebook/react-native/blob/0.72-stable/packages/react-native/Libraries/Renderer/public/ReactFabricPublicInstanceUtils.js
    ref["__nativeTag"] ||
      // @ts-expect-error — https://github.com/facebook/react-native/blob/0.72-stable/packages/react-native/Libraries/Renderer/public/ReactFabricPublicInstanceUtils.js
      ref["_internalInstanceHandle"]?.stateNode?.canonical
  );
}

export function isRemoteDebuggingAvailable(): boolean {
  return (
    !getHermesVersion() &&
    !isBridgeless() &&
    typeof NativeModules["DevSettings"]?.setIsDebuggingRemotely === "function"
  );
}

export function setRemoteDebugging(value: boolean) {
  if (isRemoteDebuggingAvailable()) {
    NativeModules["DevSettings"].setIsDebuggingRemotely(value);
  }
}
