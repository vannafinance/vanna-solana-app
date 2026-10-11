import { useIsFocused } from "expo-router";

// Polling interval for a live query. It is off while the screen is not focused (all four spaces stay mounted)
// and, through the app-state focus manager in the root layout, while the app is in the background.
export function useLiveInterval(ms: number): number | false {
  return useIsFocused() ? ms : false;
}
