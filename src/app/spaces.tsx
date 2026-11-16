import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VannaMark, Wordmark } from "@/components/brand";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { BRAND_GRADIENT, font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";

/* First-time chooser: where to start. Shown once, right after a new person connects a wallet and picks a name.
   The three modules, each with who it is for; Portfolio stays one tap away. */
const BG = "#000000", SF = "#161618", MU = "#A9A9B2", LINE = "#2A2A30";

type Choice = { href: Href; title: string; audience: string; tint: string; summary: string; detail: string; icon: IconName };
const CHOICES: Choice[] = [
  { href: "/lend" as Href, title: "Earn", audience: "For lenders", tint: "#32EEE2", summary: "Supply SOL, USDC or USDT and earn the interest borrowers pay.", detail: "No leverage · Withdraw anytime", icon: "savings" },
  { href: "/trade" as Href, title: "Trade", audience: "For traders", tint: "#CBB6FA", summary: "Long or short SOL, ETH and BTC on Phoenix, or swap tokens, from your margin account.", detail: "Up to 5x", icon: "candlestick_chart" },
  { href: "/farm" as Href, title: "Farm", audience: "Yield vaults", tint: "#FFB547", summary: "Put SOL, USDC or USDT to work in Kamino and Perena vaults.", detail: "Funded from your margin account", icon: "psychiatry" },
];

export default function Spaces() {
  const insets = useSafeAreaInsets();
  const go = (href: Href) => {
    haptic.tap();
    router.replace(href);
  };
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[s.body, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
        <View style={s.lockup} accessibilityLabel="Vanna">
          <VannaMark size={40} />
          <Wordmark height={20} />
        </View>
        <Text style={s.h}>Where do you want to start?</Text>
        <Text style={s.sub}>You can use all three any time. This only picks the first screen.</Text>

        {CHOICES.map((c) => (
          <Pressable key={c.title} onPress={() => go(c.href)} style={s.tile} accessibilityRole="button" accessibilityLabel={`${c.title}, ${c.audience}. ${c.summary}`}>
            <LinearGradient pointerEvents="none" colors={[`${c.tint}33`, `${c.tint}00`]} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.75 }} style={StyleSheet.absoluteFill} />
            <View style={s.tileHead}>
              <View style={s.iconTile}>
                <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <Icon name={c.icon} size={20} color="#FFFFFF" />
              </View>
              <Text style={s.title}>{c.title}</Text>
              <Text style={[s.aud, { color: c.tint }]}>{c.audience}</Text>
            </View>
            <Text style={s.summary}>{c.summary}</Text>
            <Text style={s.detail}>{c.detail}</Text>
          </Pressable>
        ))}

        <Pressable onPress={() => go("/portfolio" as Href)} style={s.skip} accessibilityRole="button">
          <Text style={s.skipT}>Just show my portfolio</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: 22, gap: 14 },
  lockup: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  h: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 26, lineHeight: 32 },
  sub: { color: MU, fontFamily: font.regular, fontSize: 15, lineHeight: 21, marginBottom: 6 },
  tile: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: LINE, backgroundColor: SF, padding: 16, gap: 10 },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: { width: 36, height: 36, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: "#FFFFFF", fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  aud: { fontFamily: font.semibold, fontSize: 12 },
  summary: { color: "#FFFFFF", fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  detail: { color: MU, fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  skip: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  skipT: { color: "#CBB6FA", fontFamily: font.semibold, fontSize: 15 },
});
