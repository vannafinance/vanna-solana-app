import type { PressableAndroidRippleConfig } from "react-native";

const STATE_LAYER_ALPHA = "1F";

export function ripple(color: string, borderless = false): PressableAndroidRippleConfig {
  const tinted = /^#[0-9a-f]{6}$/i.test(color) ? `${color}${STATE_LAYER_ALPHA}` : color;
  return { color: tinted, borderless };
}
