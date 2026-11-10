import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { useRewards } from "@/sample/rewards";
import { useTheme } from "@/theme/use-theme";
import { BRAND_GRADIENT, font } from "@/theme/tokens";

import { Icon } from "./ui/icon";

/* Avatars (design identicon / xPic / rw-anon): a 5×5 mirrored identicon seeded by the name, an X-linked initial disc, or the
   anonymous person glyph. */
export function Identicon({ seed, size = 32 }: { seed: string; size?: number }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = h % 360, cells: [number, number][] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 3; x++)
      if ((h >> (y * 3 + x)) & 1) {
        cells.push([x, y]);
        if (x < 2) cells.push([4 - x, y]);
      }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}>
      <Svg width={size} height={size} viewBox="0 0 5 5">
        <Rect width={5} height={5} fill={`hsl(${hue},60%,92%)`} />
        {cells.map(([x, y], i) => (
          <Rect key={i} x={x} y={y} width={1.02} height={1.02} fill={`hsl(${hue},55%,45%)`} />
        ))}
      </Svg>
    </View>
  );
}

const XP = ["#111111", "#703AE6", "#1B3290", "#FC5457", "#1C7C83"];
const hashN = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
};

export function XPic({ seed, name, size = 32 }: { seed: string; name: string; size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: XP[hashN(seed) % XP.length] }]}>
      <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: size * 0.42 }}>{name.replace(/^@/, "").charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// Your own avatar: the brand-gradient disc with the first letter of your display name (follows renames everywhere).
export const initialOf = (name: string) => (name.replace(/^@/, "").trim().charAt(0) || "?").toUpperCase();
export function MeAvatar({ size = 32 }: { size?: number }) {
  const me = useRewards();
  return (
    <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: size * 0.42, lineHeight: size * 0.56 }}>{initialOf(me.name)}</Text>
    </LinearGradient>
  );
}

export function AnonPic({ size = 32 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.segment }]}>
      <Icon name="person" size={size * 0.56} />
    </View>
  );
}

// The X (Twitter) glyph next to a linked handle.
export function XGlyph({ size = 11, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill={color} d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Svg>
  );
}

const styles = StyleSheet.create({ disc: { alignItems: "center", justifyContent: "center" } });
