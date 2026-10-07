import { PixelRatio } from "react-native";

// How much the phone's font-size setting enlarges text, held to `cap`, the same limit AppText applies. Layouts that give a figure a
// fixed width multiply that width by this, so the column grows with its text and never cuts it off.
export function useTextScale(cap = 1.15) {
  return Math.min(Math.max(PixelRatio.getFontScale(), 1), cap);
}
