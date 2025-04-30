import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import {
  NativeModules,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
// @ts-expect-error no type definitions available
import { version as coreVersion } from "react-native/Libraries/Core/ReactNativeVersion";

declare global {
  export const RN$Bridgeless: boolean;
}

type AppProps = {
  concurrentRoot?: boolean;
};

type FeatureProps =
  | { children: string; value: string }
  | {
      children: string;
      value: boolean;
      disabled?: boolean;
      onValueChange?: (value: boolean) => void;
    };

// https://github.com/facebook/react-native/blob/0abd5d63e1c0c4708f81bd698e6d011fa75f01e5/packages/new-app-screen/src/Theme.js#L16-L33
const COLORS = {
  light: {
    background: "#f3f3f3",
    backgroundHighlight: "#cfe6ee",
    cardBackground: "#fff",
    cardOutline: "#dae1e7",
    textPrimary: "#000",
    textSecondary: "#404756",
  },
  dark: {
    background: "#000",
    backgroundHighlight: "#193c47",
    cardBackground: "#222",
    cardOutline: "#444",
    textPrimary: "#fff",
    textSecondary: "#c0c1c4",
  },
};

function getHermesVersion(): string | undefined {
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

function getReactNativeVersion(): string {
  const { major, minor, patch, prerelease } = coreVersion;
  const version = `${major}.${minor}.${patch}`;
  return prerelease ? `${version}-${prerelease.replace("-", "\n")}` : version;
}

function isBridgeless() {
  return "RN$Bridgeless" in global && RN$Bridgeless === true;
}

function isConcurrentReactEnabled(props: AppProps, isFabric: boolean): boolean {
  const { major, minor } = coreVersion;
  const version = major * 10000 + minor;
  // As of 0.74, it won't be possible to opt-out:
  // https://github.com/facebook/react-native/commit/30d186c3683228d4fb7a42f804eb2fdfa7c8ac03
  return isFabric && (version >= 74 || props.concurrentRoot !== false);
}

function isFabricInstance<T>(
  ref: NativeSyntheticEvent<T>["currentTarget"]
): boolean {
  return Boolean(
    // @ts-expect-error — https://github.com/facebook/react-native/blob/0.72-stable/packages/react-native/Libraries/Renderer/public/ReactFabricPublicInstanceUtils.js
    ref["__nativeTag"] ||
      // @ts-expect-error — https://github.com/facebook/react-native/blob/0.72-stable/packages/react-native/Libraries/Renderer/public/ReactFabricPublicInstanceUtils.js
      ref["_internalInstanceHandle"]?.stateNode?.canonical
  );
}

function isOnOrOff(value: unknown): "Off" | "On" {
  return value ? "On" : "Off";
}

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

function testID(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-") + "-value";
}

function useIsFabricComponent() {
  const [isFabric, setIsFabric] = useState(isBridgeless());
  const setter = useCallback(
    ({ currentTarget }: NativeSyntheticEvent<unknown>) => {
      setIsFabric(isFabricInstance(currentTarget));
    },
    [setIsFabric]
  );
  return [isFabric, setter] as const;
}

function useLocalStorageStatus() {
  const [localValue, setLocalValue] = useState("Checking");
  useEffect(() => {
    const key = "sample/local-storage";
    window?.localStorage?.setItem(key, "Available");
    setLocalValue(window?.localStorage?.getItem(key) ?? "Error");
    return () => window?.localStorage?.removeItem(key);
  }, []);
  return localValue;
}

function useStyles() {
  const colorScheme = useColorScheme();
  return useMemo(() => {
    const colors = COLORS[colorScheme ?? "light"];

    const fontSize = 18;
    const groupBorderRadius = 8;
    const margin = 16;

    return StyleSheet.create({
      body: {
        backgroundColor: colors.background,
        flex: 1,
      },
      group: {
        backgroundColor: colors.cardBackground,
        borderRadius: groupBorderRadius,
        margin,
      },
      groupItemContainer: {
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: margin,
      },
      groupItemLabel: {
        color: colors.textPrimary,
        flex: 1,
        fontSize,
        marginVertical: 12,
      },
      groupItemValue: {
        color: colors.textSecondary,
        fontSize: fontSize,
        textAlign: "right",
      },
      separator: {
        backgroundColor: colors.cardOutline,
        height: StyleSheet.hairlineWidth,
        marginStart: margin,
      },
      title: {
        fontSize: 40,
        fontWeight: "700",
        paddingTop: 64,
        paddingHorizontal: 32,
        paddingBottom: 40,
        textAlign: "center",
      },
    });
  }, [colorScheme]);
}

function Feature({
  children: label,
  value,
  ...props
}: FeatureProps): React.ReactElement<FeatureProps> {
  const styles = useStyles();
  return (
    <View style={styles.groupItemContainer}>
      <Text style={styles.groupItemLabel}>{label}</Text>
      {typeof value === "boolean" ? (
        <Switch value={value} {...props} />
      ) : (
        <Text testID={testID(label)} style={styles.groupItemValue}>
          {value}
        </Text>
      )}
    </View>
  );
}

function Separator(): React.ReactElement {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

// TODO: Remove this component when we drop support for <0.79
function DevMenu(): React.ReactElement | null {
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

export function App(props: AppProps): React.ReactElement<AppProps> {
  const isDarkMode = useColorScheme() === "dark";
  const styles = useStyles();
  const [isFabric, setIsFabric] = useIsFabricComponent();
  const localStorageStatus = useLocalStorageStatus();

  return (
    <SafeAreaView style={styles.body}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        onLayout={setIsFabric}
        style={styles.body}
      >
        <Text style={styles.title}>Welcome to React Native</Text>
        <DevMenu />
        <View style={styles.group}>
          <Feature value={localStorageStatus}>window.localStorage</Feature>
        </View>
        <View style={styles.group}>
          <Feature value={getReactNativeVersion()}>React Native</Feature>
          <Separator />
          <Feature value={getHermesVersion() ?? "JSC"}>JS Engine</Feature>
          <Separator />
          <Feature value={isOnOrOff(isFabric)}>Fabric</Feature>
          <Separator />
          <Feature value={isOnOrOff(isConcurrentReactEnabled(props, isFabric))}>
            Concurrent React
          </Feature>
          <Separator />
          <Feature value={isOnOrOff(isBridgeless())}>Bridgeless</Feature>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
