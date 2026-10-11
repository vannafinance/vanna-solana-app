import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppearancePreference = "system" | "light" | "dark";

const STORAGE_KEY = "vanna-appearance";

// Anything missing or unrecognised means the user never chose, so the app follows the device setting.
export function parsePreference(value: string | null): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}

// The preference is cosmetic: if storage cannot be read the app starts on the device setting instead of failing to open.
export async function loadPreference(): Promise<AppearancePreference> {
  return parsePreference(await AsyncStorage.getItem(STORAGE_KEY).catch(() => null));
}

export function savePreference(preference: AppearancePreference): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEY, preference);
}
