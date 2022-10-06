// @ts-check
import React, { useCallback, useMemo, useState } from "react";
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

function getHermesVersion() {
  return (
    // @ts-expect-error
    global.HermesInternal?.getRuntimeProperties?.()["OSS Release Version"] ??
    false
  );
}

function getReactNativeVersion() {
  const version = `${coreVersion.major}.${coreVersion.minor}.${coreVersion.patch}`;
  return coreVersion.prerelease
    ? version + `-${coreVersion.prerelease}`
    : version;
}

function getRemoteDebuggingAvailability() {
  return (
    // @ts-expect-error
    global.RN$Bridgeless !== true &&
    typeof NativeModules["DevSettings"]?.setIsDebuggingRemotely === "function"
  );
}

/**
 * @param {unknown} value
 * @returns {"Off" | "On"}
 */
function isOnOrOff(value) {
  return value ? "On" : "Off";
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

/**
 * @typedef {{
 *   children: string;
 *   value: string;
 * } | {
 *   children: string;
 *   value: boolean;
 *   disabled?: boolean;
 *   onValueChange?: (value: boolean) => void;
 * }} FeatureProps
 *
 * @type {React.FunctionComponent<FeatureProps>}
 */
const Feature = ({ children, value, ...props }) => {
  const styles = useStyles();
  return (
    <View style={styles.groupItemContainer}>
      <Text style={styles.groupItemLabel}>{children}</Text>
      {typeof value === "boolean" ? (
        <Switch value={value} {...props} />
      ) : (
        <Text style={styles.groupItemValue}>{value}</Text>
      )}
    </View>
  );
};

/** @type {React.FunctionComponent<{}>} */
const Separator = () => {
  const styles = useStyles();
  return <View style={styles.separator} />;
};

/** @type {React.FunctionComponent<{}>} */
const DevMenu = () => {
  const styles = useStyles();

  const isRemoteDebuggingAvailable = getRemoteDebuggingAvailability();
  const toggleRemoteDebugging = useCallback(
    (value) => {
      if (isRemoteDebuggingAvailable) {
        NativeModules["DevSettings"].setIsDebuggingRemotely(value);
      }
    },
    [isRemoteDebuggingAvailable]
  );

  if (!isRemoteDebuggingAvailable) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Feature value={isAsyncDebugging} onValueChange={toggleRemoteDebugging}>
        Remote Debugging
      </Feature>
    </View>
  );
};

/** @type {React.FunctionComponent<{ concurrentRoot?: boolean; }>} */
const App = ({ concurrentRoot }) => {
  const isDarkMode = useColorScheme() === "dark";
  const styles = useStyles();

  const [isFabric, setFabric] = useState(false);
  const onLayout = useCallback(
    (ev) => {
      setFabric(
        Boolean(
          ev.currentTarget["_internalInstanceHandle"]?.stateNode?.canonical
        )
      );
    },
    [setFabric]
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.body}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          onLayout={onLayout}
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
};

export default App;
