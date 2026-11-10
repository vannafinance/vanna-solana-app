import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, shareIcon, Tag } from "@/components/ui/kit";
import { nf, pct, sign, spct, sUsd, tokFmt, usd } from "@/format";
import { perpMark } from "@/chain/perp-mark";
import { DATA } from "@/sample/data";
import { perpPnl, perpQty } from "@/sample/model";
import { closePosition, FUNDING, fundingOf, liqFor, openTicket, PERP_MKTS, priceFmt } from "@/screens/trade/perps";
import { useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { toast } from "@/ui/overlay";
import { AfterTransition } from "@/ui/ready";
import { openShare } from "@/screens/share/share";

/* Position page (design perps V6 U3): pair, side + leverage, P&L with ROE; one 2-column grid (entry, mark, size, collateral, leverage,
   liquidation, funding to date and rate, next funding, opened); + / share / close; funding by day. */
export default function PerpPosition() {
  useDataVersion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chain } = useChain();
  const { colors } = useTheme();
  const p = DATA[chain].perps.find((x) => x.id === id);
  const title = p ? `${p.k}-PERP ${p.side}` : "Position";

  if (!p)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title={title} />
        <View style={{ padding: 16 }}>
          <EmptyCard title="This position is closed" action="See positions" onAction={() => router.back()} module="trade" />
        </View>
      </View>
    );

  const m = PERP_MKTS.find((x) => x.k === p.k)!;
  const mark = perpMark(p.k), qty = perpQty(p), size = qty * mark, pnl = perpPnl(p), equity = p.coll + pnl;
  const liq = liqFor(chain, p), f = fundingOf(p), lev = size / Math.max(1e-9, equity);
  const now = new Date();
  const next = `${String((now.getHours() + 1) % 24).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const cells: [string, string, string, string?][] = [
    ["Entry", priceFmt(p.entry), ""],
    ["Mark", priceFmt(mark), `${spct((mark / p.entry - 1) * 100)} from entry`],
    ["Size", tokFmt(qty, p.k), usd(size)],
    ["Collateral", usd(p.coll), `Equity ${usd(equity)}`],
    ["Leverage", `${nf(lev, 1)}x`, `Opened at ${p.lev}x`],
    ["Liq. price", liq ? priceFmt(liq) : "None", liq ? `${pct((liq / mark - 1) * 100, 1)} away` : ""],
    ["Funding to date", sUsd(f), f < 0 ? "Paid" : "Received", sign(f)],
    ["Funding rate", `${m.fund >= 0 ? "+" : "−"}${nf(Math.abs(m.fund), 4)}% / 1h`, `${spct(m.fund * 24 * 365, 1)} a year, ${(m.fund >= 0) === (p.side === "long") ? "you pay" : "you earn"}`, m.fund >= 0 ? "pos" : "neg"],
    ["Next funding", next, "Every hour"],
    ["Opened", p.t.split(",")[0], `${p.t.split(", ")[1] ?? ""} UTC`],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title={title} />
      <AfterTransition>
        <ScrollView contentContainerStyle={styles.body}>
          <Card>
            <View style={styles.head}>
              <TokenLogo sym={p.k} size={44} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.pair, { color: colors.text }]}>{p.k}-PERP</Text>
                <Tag label={`${p.side === "long" ? "Long" : "Short"} ${p.lev}x`} tone={p.side} />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.pnl, { color: sign(pnl) === "neg" ? colors.negative : colors.positive }]}>{sUsd(pnl)}</Text>
                <Text style={[styles.cap, { color: sign(pnl) === "neg" ? colors.negative : colors.positive, fontFamily: font.semibold }]}>{spct((pnl / p.coll) * 100)} ROE</Text>
              </View>
            </View>
            <View style={[styles.grid, { backgroundColor: colors.bg }]}>
              {cells.map(([l, v, s2, t], i) => (
                <View key={l} style={[styles.cell, i % 2 === 1 && { borderLeftWidth: 1, borderLeftColor: colors.divider }, i > 1 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                  <Text style={[styles.cap, { color: colors.muted }]}>{l}</Text>
                  <Text style={[styles.v, { color: t === "neg" ? colors.negative : t === "pos" ? colors.positive : colors.text }]} numberOfLines={1}>{v}</Text>
                  {s2 ? <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{s2}</Text> : null}
                </View>
              ))}
            </View>
            <View style={styles.acts}>
              <IconAction icon="add" label="Add collateral" tone="surface" onPress={() => openTicket(p.k, p.side)} />
              <IconAction icon={shareIcon} label="Share this position" tone="plain" onPress={() => openShare({ kind: "perps", id: p.id })} />
              <IconAction icon="close" label={`Close ${p.k}-PERP`} tone="neg" onPress={() => closePosition(chain, p)} />
            </View>
          </Card>
          <Card style={{ gap: 0 }}>
            <Text style={[styles.pair, { color: colors.text, fontSize: 17, marginBottom: 4 }]}>Funding by day</Text>
            {(FUNDING[p.id] ?? [["Oct 7", 1, f] as [string, number, number]]).map(([day, n, v], i) => (
              <FundDay key={day} day={day} n={n} v={v} first={i === 0} hourly={v / Math.max(1, n)} />
            ))}
          </Card>
        </ScrollView>
      </AfterTransition>
    </View>
  );
}

function FundDay({ day, n, v, first, hourly }: { day: string; n: number; v: number; first: boolean; hourly: number }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={!first && { borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Pressable onPress={() => setOpen(!open)} style={styles.fd} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={[styles.clock, { backgroundColor: colors.bg }]}>
          <Icon name="schedule" size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.v, { color: colors.text, fontSize: 15 }]}>{day}</Text>
          <Text style={[styles.cap, { color: colors.muted }]}>{n} payments</Text>
        </View>
        <Text style={[styles.v, { fontSize: 15, color: v < 0 ? colors.negative : colors.positive }]}>{sUsd(v)}</Text>
        <Icon name={open ? "expand_less" : "expand_more"} size={20} color="muted" />
      </Pressable>
      {open && (
        <Text style={[styles.cap, { color: colors.muted, paddingBottom: 12, paddingLeft: 48 }]}>
          {n} hourly payments, about {sUsd(hourly)} each.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 32 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  pair: { fontFamily: font.semibold, fontSize: 18 },
  pnl: { fontFamily: font.semibold, fontSize: 22, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums", "no-contextual"] },
  v: { fontFamily: font.semibold, fontSize: 17, lineHeight: 24, fontVariant: ["tabular-nums", "no-contextual"] },
  grid: { flexDirection: "row", flexWrap: "wrap", borderRadius: 12, overflow: "hidden" },
  cell: { width: "50%", paddingHorizontal: 12, paddingVertical: 12, gap: 2 },
  acts: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  fd: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 },
  clock: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
