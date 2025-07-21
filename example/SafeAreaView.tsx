import * as React from "react";
import type { SafeAreaViewProps } from "react-native-safe-area-context";
import {
  SafeAreaProvider,
  SafeAreaView as SafeAreaViewInternal,
  initialWindowMetrics,
} from "react-native-safe-area-context";

export function SafeAreaView(props: SafeAreaViewProps) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaViewInternal {...props} />
    </SafeAreaProvider>
  );
}
