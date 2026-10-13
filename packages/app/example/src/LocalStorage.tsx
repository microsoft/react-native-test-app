import React from "react";
import { View } from "react-native";
import { Feature } from "./Feature";
import { useStyles } from "./styles";

function useLocalStorageStatus() {
  const key = "sample/local-storage";
  window?.localStorage?.setItem(key, "Available");
  const value = window?.localStorage?.getItem(key) ?? "Error";
  window?.localStorage?.removeItem(key);
  return value;
}

export function LocalStorageStatus(): React.ReactElement {
  const styles = useStyles();
  const localStorageStatus = useLocalStorageStatus();
  return (
    <View style={styles.group}>
      <Feature value={localStorageStatus}>window.localStorage</Feature>
    </View>
  );
}
