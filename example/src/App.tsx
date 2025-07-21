import React, { useCallback, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import {
  ScrollView,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Feature } from "./Feature";
import { LocalStorageStatus } from "./LocalStorage";
import { RemoteDebugging } from "./RemoteDebugging";
import { SafeAreaView } from "./SafeAreaView";
import { Separator } from "./Separator";
import {
  getHermesVersion,
  isBridgeless,
  isConcurrentReactEnabled,
  isFabricInstance,
  ReactNativeVersion,
} from "./core";
import { useStyles } from "./styles";

declare global {
  export const RN$Bridgeless: boolean;
}

type AppProps = {
  concurrentRoot?: boolean;
};

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

export function App(props: AppProps): React.ReactElement<AppProps> {
  const isDarkMode = useColorScheme() === "dark";
  const styles = useStyles();
  const [isFabric, setIsFabric] = useIsFabricComponent();

  return (
    <SafeAreaView style={styles.body}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        onLayout={setIsFabric}
        style={styles.body}
      >
        <Text style={styles.title}>Welcome to React Native</Text>
        <RemoteDebugging />
        <LocalStorageStatus />
        <View style={styles.group}>
          <Feature value={ReactNativeVersion.getVersionString()}>
            React Native
          </Feature>
          <Separator />
          <Feature value={getHermesVersion() ?? "JSC"}>JS Engine</Feature>
          <Separator />
          <Feature value={isFabric}>Fabric</Feature>
          <Separator />
          <Feature value={isConcurrentReactEnabled(props, isFabric)}>
            Concurrent React
          </Feature>
          <Separator />
          <Feature value={isBridgeless()}>Bridgeless</Feature>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
