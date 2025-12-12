import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Feature } from "./Feature";
import { useStyles } from "./styles";

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

export function LocalStorageStatus(): React.ReactElement {
  const styles = useStyles();
  const localStorageStatus = useLocalStorageStatus();
  return (
    <View style={styles.group}>
      <Feature value={localStorageStatus}>window.localStorage</Feature>
    </View>
  );
}
