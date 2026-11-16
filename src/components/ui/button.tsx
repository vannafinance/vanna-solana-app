import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/use-theme";
import { type Family, font } from "@/theme/tokens";

import { Icon } from "./icon";
import type { IconName } from "./material-symbols";

// Buttons (design btn): primary = the module's CTA gradient (c0 → c1); outline; text; dark; danger. lg = 52 px, md = 44 px.
export function Button({
  label, onPress, v = "primary", fam, size = "lg", icon, disabled, style,
}: { label: string; onPress?: () => void; v?: "primary" | "outline" | "text" | "dark" | "danger"; fam?: Family; size?: "lg" | "md"; icon?: IconName; disabled?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  const h = size === "lg" ? 52 : 44;
  const fg = disabled ? colors.onDisabled : v === "primary" || v === "danger" ? "#FFFFFF" : v === "dark" ? colors.onChipActive : colors.text;
  const bg = disabled ? colors.disabled : v === "dark" ? colors.chipActive : v === "danger" ? colors.negative : "transparent";
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.b,
        { height: h, borderRadius: h / 2, backgroundColor: bg, opacity: pressed ? 0.85 : 1 },
        v === "outline" && { borderWidth: 1, borderColor: colors.borderControl },
        style,
      ]}
    >
      {v === "primary" && !disabled && <LinearGradient colors={fam?.c ?? ["#8B4DF7", "#5A26C9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: h / 2 }]} />}
      {icon && (
        <View style={{ zIndex: 1 }}>
          <Icon name={icon} size={20} color={fg} />
        </View>
      )}
      <Text style={[styles.t, { color: fg, fontSize: size === "lg" ? 16 : 14 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  b: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, overflow: "hidden" },
  t: { fontFamily: font.semibold },
});
