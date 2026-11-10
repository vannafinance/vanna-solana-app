import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { nf } from "@/format";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

import { ask, cf, type Ev, lab, mName, type Out, p2, RATE, type Side, team, usdC, vaultDeposited } from "./model";

/* Small Predict pieces (design .pd-*): tags, team / event icons, the Yes / No quote button, the pairing meter, info tips. */
export type Tone = "blue" | "pink" | "teal" | "grey";

export function Chip({ label, tone, icon }: { label: string; tone: Tone; icon?: IconName }) {
  const { colors } = useTheme();
  const look = { blue: [colors.blueTint, colors.onBlueTint], pink: [colors.pinkTint, colors.onPinkTint], teal: [colors.tealTint, colors.onTealTint], grey: [colors.bg, colors.muted] }[tone];
  return (
    <View style={[s.chip, { backgroundColor: look[0] }]}>
      {icon && <Icon name={icon} size={14} color={look[1]} />}
      <Text style={[s.chipT, { color: look[1] }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}
export const SideTag = ({ side, label }: { side: Side; label: string }) => <Chip label={label} tone={side === "yes" ? "blue" : "pink"} />;

export function TeamLogo({ o, size = 24 }: { o: Out; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: o.col, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)" }}>
      <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: Math.round(size * 0.46), lineHeight: Math.round(size * 0.6) }}>{o.ini}</Text>
    </View>
  );
}

// Available Material icons stand in for the few the design uses that this build does not ship (gavel, monitoring, public...).
const ICN: Record<string, IconName> = { economics: "query_stats", politics: "how_to_vote", sports: "sports_soccer", crypto: "trending_up", account_balance: "account_balance", public: "language", monitoring: "query_stats", gavel: "balance", how_to_vote: "how_to_vote", sports_soccer: "sports_soccer" };

export function EvIcon({ e, size = 40 }: { e: Ev | null; size?: number }) {
  const { colors } = useTheme();
  if (!e) return <View style={[s.ic, { width: size, height: size, backgroundColor: colors.blueTint }]}><TokenLogo sym="POLY" size={Math.round(size * 0.9)} /></View>;
  if (e.asset) return <TokenLogo sym={e.asset} size={size} />;
  if (e.type === "match") {
    const ts = e.outs.filter((o) => !o.grp && o.k !== "draw"), t = Math.round(size * 0.6);
    return (
      <View style={{ width: size, height: size }}>
        <View style={{ position: "absolute", left: 0, top: 0 }}><TeamLogo o={ts[0]} size={t} /></View>
        <View style={{ position: "absolute", right: 0, bottom: 0 }}><TeamLogo o={ts[ts.length - 1]} size={t} /></View>
      </View>
    );
  }
  const icon = ICN[e.icn ?? ""] ?? ICN[e.cat] ?? "how_to_vote";
  return <View style={[s.ic, { width: size, height: size, backgroundColor: colors.tealTint }]}><Icon name={icon} size={Math.round(size * 0.55)} color={colors.onTealTint} /></View>;
}
export const OutIcon = ({ e, o, size = 32 }: { e: Ev | null; o?: Out; size?: number }) => (o && team(o) ? <TeamLogo o={o} size={size} /> : <EvIcon e={e} size={size} />);

// Yes / No quote button: tinted blue (Yes) and pink (No), selected = solid.
export function QBtn({ e, o, side, onPress, wide, sel, label }: { e: Ev; o: Out; side: Side; onPress: () => void; wide?: boolean; sel?: boolean; label?: string }) {
  const { colors } = useTheme();
  const yes = side === "yes";
  const bg = sel ? (yes ? "#2440A9" : colors.negative) : yes ? colors.blueTint : colors.pinkTint;
  const fg = sel ? "#FFFFFF" : yes ? colors.onBlueTint : colors.onPinkTint;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Buy ${lab(o, side)} on ${mName(e, o)} at ${cf(ask(o, side))}`}
      style={({ pressed }) => [s.q, wide ? { flex: 1, height: 44, borderRadius: 12 } : { minWidth: 64 }, { backgroundColor: bg, opacity: pressed ? 0.75 : 1 }]}
    >
      <Text style={{ fontFamily: font.semibold, fontSize: wide ? 14 : 13, color: fg, fontVariant: ["tabular-nums"] }} numberOfLines={1}>{label ?? `${lab(o, side)} ${cf(ask(o, side))}`}</Text>
    </Pressable>
  );
}

export function Meter({ f }: { f: number }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[s.mt, { backgroundColor: colors.blueTint }]}>
      <View style={{ height: 8, borderRadius: 4, width: `${Math.max(0, Math.min(1, f)) * 100}%`, backgroundColor: isDark ? "#5BE8F1" : "#1C7C83" }} />
    </View>
  );
}

// Info icon + the box under it (one open at a time per screen: the parent keeps the key).
export function TipBtn({ k, open, setOpen, label = "More info" }: { k: string; open: string | null; setOpen: (k: string | null) => void; label?: string }) {
  return (
    <Pressable onPress={() => setOpen(open === k ? null : k)} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open === k }}>
      <Icon name="info" size={16} color="muted" />
    </Pressable>
  );
}
export function TipBox({ k, open, children }: { k: string; open: string | null; children: ReactNode }) {
  const { colors } = useTheme();
  if (open !== k) return null;
  return <View style={[s.tip, { backgroundColor: colors.bg }]}>{children}</View>;
}
export function useTip() {
  return useState<string | null>(null);
}
export const TIPS = {
  earn: () => [`Your shares earn when they can be paired with the other side in their market's pool. Each pair is $1 lent in Vanna's USDC pool at ${p2(RATE())} APY.`, "Yield comes as extra shares of your side, so it pays only if your side wins."],
  earnLine: () => ["Your shares earn when they can be paired with the other side in this market's pool; unpaired shares wait. Yield comes as extra shares of your side, so it pays only if your side wins."],
  paired: () => ["Your shares earn when they can be paired with the opposite side in this market's pool. Unpaired shares wait until more of the other side arrives."],
  pairs: () => ["Each pair is one Yes and one No share from this market. Each pair is $1 lent in Vanna's USDC pool."],
  tracked: () => ["Tracked positions count in your portfolio. They earn nothing here until you bring them to Vanna."],
  notListed: () => ["This market is not listed on Vanna, so it stays on Polymarket and is only tracked here."],
  pay: () => ["A buy can use USDC or CASH. World settles in CASH, so USDC is swapped to CASH at par first."],
} as const;
export const Tips = ({ k }: { k: keyof typeof TIPS }) => (
  <>
    {TIPS[k]().map((x) => (
      <TipText key={x}>{x}</TipText>
    ))}
  </>
);
function TipText({ children }: { children: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.text }}>{children}</Text>;
}

// "Earn while you wait" banner shown while the user holds nothing.
export function EarnLine() {
  const { colors } = useTheme();
  const [open, setOpen] = useTip();
  return (
    <View style={[s.ban, { backgroundColor: colors.surface }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={[s.ic, { width: 40, height: 40, backgroundColor: colors.tealTint }]}><Icon name="savings" size={22} color={colors.onTealTint} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.b, { color: colors.text }]}>Earn while you wait</Text>
          <Text style={[s.cap, { color: colors.muted }]}>Up to {nf(RATE(), 1)}% APY, {usdC(vaultDeposited())} earning</Text>
        </View>
        <TipBtn k="earn" open={open} setOpen={setOpen} label="How earning works" />
      </View>
      <TipBox k="earn" open={open}><Tips k="earn" /></TipBox>
    </View>
  );
}

export const s = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, minHeight: 22, borderRadius: 6 },
  chipT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  ic: { borderRadius: 12, alignItems: "center", justifyContent: "center" },
  q: { height: 36, paddingHorizontal: 8, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mt: { height: 8, borderRadius: 4, overflow: "hidden", flex: 1, minWidth: 40 },
  tip: { padding: 12, borderRadius: 12, gap: 6, marginTop: 8 },
  ban: { borderRadius: 16, padding: 16 },
  b: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
});
