import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { TokenLogo } from "@/components/brand";
import { MascotBody } from "@/mascot/mascot";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

import { Icon } from "./icon";
import type { IconName } from "./material-symbols";

/* Shared building blocks for module pages, from base.css and portfolio.css (.card, .pf-prs, .pf-split, .tag, .pf-row, .segt). */

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors, isDark } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }, !isDark && styles.cardShadow, style]}>{children}</View>;
}

export function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.head}>
      <Text style={[styles.headTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

export type Pair = { label: string; value: string; sub?: string; dot?: string; tone?: "pos" | "neg" | "warn" | ""; onPress?: () => void; chevron?: IconName };

// Label / value pairs in rows of n with 1 px dividers (the shipped StatStrip rhythm).
export function Pairs({ items, n = Math.min(3, items.length) }: { items: Pair[]; n?: number }) {
  const { colors } = useTheme();
  const rows: Pair[][] = [];
  for (let i = 0; i < items.length; i += n) rows.push(items.slice(i, i + n));
  const toneColor = (t?: Pair["tone"]) => (t === "pos" ? colors.positive : t === "neg" ? colors.negative : t === "warn" ? colors.warning : colors.text);

  return (
    <View style={[styles.pairs, { backgroundColor: colors.bg }]}>
      {rows.map((row, ri) => (
        <View key={ri} style={[styles.pairRow, ri > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
          {row.map((p, i) => {
            const body = (
              <>
                <View style={styles.pairLabel}>
                  {p.dot && <View style={[styles.dot, { backgroundColor: p.dot }]} />}
                  <Text style={[styles.pairLabelText, { color: colors.muted }]} numberOfLines={1}>
                    {p.label}
                  </Text>
                  {p.chevron && <Icon name={p.chevron} size={16} color="muted" />}
                </View>
                <Text style={[styles.pairValue, { color: toneColor(p.tone) }, p.dot && { paddingLeft: 14 }]} numberOfLines={1}>
                  {p.value}
                </Text>
                {p.sub != null && <Text style={[styles.pairLabelText, { color: colors.muted, fontVariant: ["tabular-nums"] }]}>{p.sub}</Text>}
              </>
            );
            const style = [styles.pair, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.divider, paddingLeft: 12, marginLeft: 11 }];
            return p.onPress ? (
              <Pressable key={p.label + i} onPress={p.onPress} accessibilityRole="button" accessibilityLabel={`${p.label} ${p.value}`} style={style}>
                {body}
              </Pressable>
            ) : (
              <View key={p.label + i} style={style}>
                {body}
              </View>
            );
          })}
          {row.length < n && Array.from({ length: n - row.length }, (_, i) => <View key={`pad${i}`} style={[styles.pair, styles.pad]} />)}
        </View>
      ))}
    </View>
  );
}

// Split bar: each part's share of the absolute total.
export function SplitBar({ parts }: { parts: [number, string][] }) {
  const { colors } = useTheme();
  const total = parts.reduce((t, [v]) => t + Math.abs(v), 0);
  return (
    <View style={[styles.split, { backgroundColor: colors.segment }]} aria-hidden>
      {total > 0.004 &&
        parts
          .filter(([v]) => Math.abs(v) > 0.004)
          .map(([v, c], i) => <View key={i} style={{ flex: Math.abs(v) / total, backgroundColor: c }} />)}
    </View>
  );
}

// Token / chain / venue logo (real assets from the design).
export function TokenBadge({ sym, size = 36 }: { sym: string; size?: number }) {
  return <TokenLogo sym={sym} size={size} />;
}

export function Tag({ label, tone }: { label: string; tone: "long" | "short" | "grey" | "teal" }) {
  const { colors } = useTheme();
  const look =
    tone === "long" ? { bg: "#703AE6", fg: "#FFFFFF" }
    : tone === "short" ? { bg: colors.negative, fg: "#FFFFFF" }
    : tone === "teal" ? { bg: colors.tealTint, fg: colors.onTealTint }
    : { bg: colors.segment, fg: colors.muted };
  return (
    <View style={[styles.tag, { backgroundColor: look.bg }]}>
      <Text style={[styles.tagText, { color: look.fg }]}>{label}</Text>
    </View>
  );
}

// A list row: leading art, title + subtitle, trailing value + subvalue, chevron.
export function Row(props: {
  lead: ReactNode;
  title: string;
  sub?: ReactNode;
  value: string;
  valueTone?: "pos" | "neg" | "";
  subValue?: string;
  subTone?: "pos" | "neg" | "";
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const tone = (t?: string) => (t === "pos" ? colors.positive : t === "neg" ? colors.negative : undefined);
  return (
    <Pressable onPress={props.onPress} android_ripple={{ color: colors.divider }} style={styles.row} accessibilityRole="button">
      {props.lead}
      <View style={styles.rowMid}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {props.title}
        </Text>
        {typeof props.sub === "string" ? <Text style={[styles.rowSub, { color: colors.muted }]}>{props.sub}</Text> : props.sub}
      </View>
      <View style={styles.rowEnd}>
        <Text style={[styles.rowTitle, { color: tone(props.valueTone) ?? colors.text }]}>{props.value}</Text>
        {props.subValue != null && <Text style={[styles.rowSub, { color: tone(props.subTone) ?? colors.muted }]}>{props.subValue}</Text>}
      </View>
      <Icon name="chevron_right" size={20} color="muted" />
    </Pressable>
  );
}

// Round icon action (design .iact): 40 px visual, 44 px target, label for screen readers.
// tone: tonal (default, on cards) | surface (on the page background) | hero (on a gradient) | primary | neg | plain
export function IconAction({ icon, label, onPress, tone = "tonal", gradient, ring }: { icon: IconName; label: string; onPress?: () => void; ring?: boolean; tone?: "tonal" | "surface" | "hero" | "primary" | "neg" | "plain" | "light"; gradient?: [string, string] }) {
  const { colors } = useTheme();
  const look = {
    tonal: { bg: colors.segment, fg: colors.text },
    surface: { bg: colors.surface, fg: colors.text },
    hero: { bg: "rgba(255,255,255,0.18)", fg: "#FFFFFF" },
    primary: { bg: "transparent", fg: "#FFFFFF" },
    neg: { bg: colors.pinkTint, fg: colors.onPinkTint },
    plain: { bg: "transparent", fg: colors.muted },
    // white disc for a coloured hero whose own hue would hide a red / brand button (Flash repay on Farm)
    light: { bg: "#FFFFFF", fg: "#C8264F" },
  }[tone];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={2} style={({ pressed }) => [styles.iconAction, { backgroundColor: look.bg, opacity: pressed ? 0.7 : 1 }, ring && { borderWidth: 2, borderColor: "#FFFFFF" }]}>
      {tone === "primary" && <LinearGradient colors={gradient ?? ["#8D61EB", "#5029A3"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />}
      {/* above the gradient (web paints positioned elements over static ones) */}
      <View style={{ zIndex: 1 }}>
        <Icon name={icon} size={22} color={look.fg} />
      </View>
    </Pressable>
  );
}

export const shareIcon: IconName = Platform.OS === "ios" ? "ios_share" : "share";

export const supplyMark: IconName = "add_circle";
export const withdrawMark: IconName = "do_not_disturb_on";

// Empty state (design T3): the sleeping chameleon in the module's colour, a title and its one action; no explanatory body.
export function EmptyCard({ title, action, onAction, module }: { title: string; action?: string; onAction?: () => void; module?: string }) {
  const { colors } = useTheme();
  return (
    <Card style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
      <MascotBody width={96} module={module} asleep />
      <Text style={[styles.headTitle, { color: colors.text, flex: 0, fontSize: 16 }]}>{title}</Text>
      {action && (
        <Pressable onPress={onAction} style={[styles.outlineBtn, { borderColor: colors.borderControl }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{action}</Text>
        </Pressable>
      )}
    </Card>
  );
}

export const text = StyleSheet.create({
  muted: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  big: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
});

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 10 },
  cardShadow: { shadowColor: "#111111", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, marginTop: -10 },
  headTitle: { flex: 1, fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  pairs: { borderRadius: 12, paddingHorizontal: 12 },
  pairRow: { flexDirection: "row" },
  pair: { flex: 1, minWidth: 0, gap: 2, paddingVertical: 12 },
  pad: {},
  pairLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  pairLabelText: { flexShrink: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  // no-contextual: Plus Jakarta Sans turns "5x" into "5×"; the design shows a plain x
  pairValue: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["no-contextual", "tabular-nums"] },
  dot: { width: 8, height: 8, borderRadius: 2 },
  split: { flexDirection: "row", gap: 2, height: 6, borderRadius: 99, overflow: "hidden" },
  tag: { alignSelf: "flex-start", minHeight: 22, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, fontVariant: ["no-contextual", "tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8 },
  rowMid: { flex: 1, minWidth: 0, gap: 2 },
  rowEnd: { alignItems: "flex-end", gap: 2 },
  rowTitle: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["no-contextual", "tabular-nums"] },
  rowSub: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["no-contextual", "tabular-nums"] },
  iconAction: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { height: 36, paddingHorizontal: 16, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  segt: { flexDirection: "row", height: 48, borderBottomWidth: 1 },
  segtItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  segtLine: { position: "absolute", left: 0, right: 0, bottom: -1, height: 2 },
  outlineBtn: { height: 40, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
