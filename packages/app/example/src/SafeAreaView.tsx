import * as React from "react";
import { View } from "react-native";
import type { SafeAreaViewProps } from "react-native-safe-area-context";
import {
  SafeAreaProvider,
  SafeAreaView as SafeAreaViewInternal,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { isBridgeless } from "./core";

export function SafeAreaView(props: SafeAreaViewProps) {
  // TODO: `SafeAreaView` currently crashes in bridgeless mode
  if (isBridgeless()) {
    return <View {...props} />;
  } else {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaViewInternal {...props} />
      </SafeAreaProvider>
    );
  }
}
