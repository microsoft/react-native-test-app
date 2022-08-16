import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Colors, Header } from "react-native/Libraries/NewAppScreen";
import { version as coreVersion } from "react-native/Libraries/Core/ReactNativeVersion";

function getHermesVersion() {
  return (
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
        marginHorizontal: margin,
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

const Feature = ({ children, value }) => {
  const styles = useStyles();
  return (
    <View style={styles.groupItemContainer}>
      <Text style={styles.groupItemLabel}>{children}</Text>
      {typeof value === "boolean" ? (
        <Switch value={value} />
      ) : (
        <Text style={styles.groupItemValue}>{value}</Text>
      )}
    </View>
  );
};

const Separator = () => {
  const styles = useStyles();
  return <View style={styles.separator} />;
};

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

  const hermesVersion = getHermesVersion();

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
          <View style={styles.group}>
            <Feature value={getReactNativeVersion()}>React Native</Feature>
            <Separator />
            <Feature value={Boolean(hermesVersion)}>Hermes</Feature>
            <Separator />
            <Feature value={isFabric}>Fabric</Feature>
            <Separator />
            <Feature value={isFabric && Boolean(concurrentRoot)}>
              Concurrent React
            </Feature>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;
