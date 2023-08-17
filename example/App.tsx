import React, { useCallback, useMemo, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import {
  NativeModules,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
// @ts-expect-error
import { version as coreVersion } from "react-native/Libraries/Core/ReactNativeVersion";
import { Colors, Header } from "react-native/Libraries/NewAppScreen";
// @ts-expect-error
import { isAsyncDebugging } from "react-native/Libraries/Utilities/DebugEnvironment";

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

function getHermesVersion() {
  return (
    // @ts-expect-error
    global.HermesInternal?.getRuntimeProperties?.()["OSS Release Version"] ??
    false
  );
}

function getReactNativeVersion(): string {
  const { major, minor, patch, prerelease } = coreVersion;
  const version = `${major}.${minor}.${patch}`;
  return prerelease ? `${version}-${prerelease}` : version;
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
    // @ts-expect-error
    global.RN$Bridgeless !== true &&
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
  const [isFabric, setIsFabric] = useState(false);
  const setter = useCallback(
    ({ currentTarget }: NativeSyntheticEvent<unknown>) => {
      setIsFabric(isFabricInstance(currentTarget));
    },
    [setIsFabric]
  );
  return [isFabric, setter] as const;
}

function useStyles() {
  const colorScheme = useColorScheme();
  return useMemo(() => {
    const isDarkMode = colorScheme === "dark";

    const fontSize = 18;
    const groupBorderRadius = 8;
    const margin = 16;

    return StyleSheet.create({
      body: {
        backgroundColor: isDarkMode ? Colors.black : Colors.lighter,
        flex: 1,
      },
      group: {
        backgroundColor: isDarkMode ? Colors.darker : Colors.white,
        borderRadius: groupBorderRadius,
        margin,
      },
      groupItemContainer: {
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: margin,
      },
      groupItemLabel: {
        color: isDarkMode ? Colors.white : Colors.black,
        flex: 1,
        fontSize,
        marginVertical: 12,
      },
      groupItemValue: {
        color: isDarkMode ? Colors.light : Colors.dark,
        fontSize: fontSize,
      },
      separator: {
        backgroundColor: isDarkMode ? Colors.dark : Colors.light,
        height: StyleSheet.hairlineWidth,
        marginStart: margin,
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

function DevMenu(): React.ReactElement | null {
  const styles = useStyles();

  if (!isRemoteDebuggingAvailable()) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Feature value={isAsyncDebugging} onValueChange={setRemoteDebugging}>
        Remote Debugging
      </Feature>
    </View>
  );
}

function App({ concurrentRoot }: AppProps): React.ReactElement<AppProps> {
  const isDarkMode = useColorScheme() === "dark";
  const styles = useStyles();
  const [isFabric, setIsFabric] = useIsFabricComponent();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.body}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          onLayout={setIsFabric}
          style={styles.body}
        >
          <Header />
          <DevMenu />
          <View style={styles.group}>
            <Feature value={getReactNativeVersion()}>React Native</Feature>
            <Separator />
            <Feature value={isOnOrOff(getHermesVersion())}>Hermes</Feature>
            <Separator />
            <Feature value={isOnOrOff(isFabric)}>Fabric</Feature>
            <Separator />
            <Feature value={isOnOrOff(isFabric && concurrentRoot)}>
              Concurrent React
            </Feature>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
