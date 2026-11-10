import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import type { Activity } from "@/sample/data";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { toast } from "@/ui/overlay";

import { TokenLogo } from "./brand";
import { Icon } from "./ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon } from "./ui/kit";
import { openShare } from "@/screens/share/share";

/* History rows (design margin / perps history): token, the action as a tag, time, the amount with its USD value, and a chevron that
   opens the row's details in place (amount, value, venue, transaction). A liquidation carries its share button. */
type Tone = "grey" | "teal" | "violet" | "red" | "pink";
const TONE: Record<string, Tone> = {
  Supply: "teal", Deposit: "grey", Withdraw: "grey", Borrow: "grey", Repay: "grey", Long: "violet", Short: "red", Close: "grey",
  Liquidated: "pink", Swap: "grey", Buy: "teal", "Test funds": "teal", "Account created": "grey",
};

export function ActionTag({ label, tone }: { label: string; tone: Tone }) {
  const { colors } = useTheme();
  const look = {
    grey: [colors.segment, colors.muted],
    teal: [colors.tealTint, colors.onTealTint],
    violet: ["#3B2484", "#E1D5FA"],
    red: ["#6B0F1A", "#FFB3B5"],
    pink: [colors.pinkTint, colors.onPinkTint],
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: look[0] }]}>
      <Text style={[styles.tagT, { color: look[1] }]}>{label}</Text>
    </View>
  );
}

export function HistoryList({ rows, empty = "No transactions yet", module }: { rows: Activity[]; empty?: string; module?: string }) {
  if (!rows.length) return <EmptyCard title={empty} module={module} />;
  return (
    <Card style={{ gap: 0, paddingVertical: 4 }}>
      {rows.map((r, i) => (
        <HistoryRow key={r.tx + i} r={r} first={i === 0} />
      ))}
    </Card>
  );
}

function HistoryRow({ r, first }: { r: Activity; first: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const liq = /liquid/i.test(r.action);
  const legs = r.amt.split(", ").filter(Boolean);
  const main = legs[legs.length - 1] ?? "—";
  const usdText = r.usd != null ? `$${Math.abs(r.usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  const neg = main.startsWith("−") || (r.usd ?? 0) < 0;
  return (
    <Animated.View layout={LinearTransition.duration(180)} style={!first && { borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Pressable onPress={() => setOpen(!open)} style={styles.row} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${r.action} ${r.detail}, ${r.t}`}>
        <TokenLogo sym={r.sym ?? "USDC"} size={36} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ActionTag label={r.action} tone={TONE[r.action] ?? "grey"} />
          <Text style={[styles.time, { color: colors.muted }]}>{r.t}</Text>
        </View>
        <View style={{ alignItems: "flex-end", maxWidth: "45%" }}>
          <Text numberOfLines={1} style={[styles.amt, { color: neg ? colors.negative : colors.text }]}>{main}</Text>
          {usdText !== "" && main !== "" && <Text style={[styles.time, { color: colors.muted }]}>{usdText}</Text>}
        </View>
        {liq && <IconAction icon={shareIcon} label="Share this liquidation" tone="plain" onPress={() => openShare({ kind: "liq", id: r.tx })} />}
        <Icon name={open ? "expand_less" : "expand_more"} size={20} color="muted" />
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(150)} style={{ paddingBottom: 12, gap: 8 }}>
          <Pairs
            n={2}
            items={[
              { label: "Detail", value: r.detail },
              ...legs.slice(0, 2).map((l, i) => ({ label: i === 0 && legs.length > 1 ? "Paid" : legs.length > 1 ? "Received" : "Amount", value: l })),
              ...(r.via ? [{ label: "Route", value: r.via }] : []),
              { label: "Transaction", value: r.tx },
            ]}
          />
          <Pressable onPress={() => toast(`Explorer: ${r.tx}`)} style={styles.x} accessibilityRole="link">
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.link }}>View on explorer</Text>
            <Icon name="open_in_new" size={16} color="link" />
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 8 },
  tag: { alignSelf: "flex-start", minHeight: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  tagT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, fontVariant: ["no-contextual"] },
  time: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  amt: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, fontVariant: ["tabular-nums", "no-contextual"] },
  x: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
});
