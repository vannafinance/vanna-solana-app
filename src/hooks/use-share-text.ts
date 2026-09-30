import { Share } from "react-native";

// expo-clipboard is not installed; the system share sheet is the copy path until it is.
export function useShareText() {
  return (message: string) => void Share.share({ message });
}
