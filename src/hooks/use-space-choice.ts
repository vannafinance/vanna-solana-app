import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vanna.space-chosen";

export type EntryRoute = "/home" | "/spaces";

export function useSpaceChoice() {
  const [chosen, setChosen] = useState<boolean>();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(
      (value) => setChosen(value !== null),
      () => setChosen(false),
    );
  }, []);

  const choose = useCallback(async () => {
    setChosen(true);
    await AsyncStorage.setItem(STORAGE_KEY, "1");
  }, []);

  return {
    status: chosen === undefined ? ("loading" as const) : ("ready" as const),
    entryRoute: (chosen ? "/home" : "/spaces") as EntryRoute,
    choose,
  };
}
