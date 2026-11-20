import { useLocalSearchParams } from "expo-router";

import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAccountRead } from "@/chain/account-live";
import { TokenLogo } from "@/components/brand";
import { PillTabs, Swap } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon } from "@/components/ui/kit";
import { pct, usd } from "@/format";
import { MascotBody } from "@/mascot/mascot";
import { ACTIVITY, type Pool } from "@/sample/data";
import { type Chain, useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";

import { openAmount } from "@/screens/earn/amount";
import { balTok, cNum, collList, cUsd, freeTok, fT, lendOf, poolOf, px, shareRate, shareSym } from "@/screens/earn/model";
import { PoolAnalytics } from "@/screens/earn/pool-analytics";
import { PoolActivity, PoolDetails } from "@/screens/earn/pool-details";
import { AfterTransition } from "@/ui/ready";
import { openShare } from "@/screens/share/share";

/* Vault detail (design SCREENS['earn-vault'], design/lend-pool): the vault card, Position | Details | Activity | Collateral | Analytics,
   Withdraw / Supply. Each tab is its own component, so a data refresh re-renders it without re-mounting (the chart keeps its state). */
type T = "position" | "details" | "activity" | "collateral" | "analytics";

export default function Vault() {
  useDataVersion();
  const { sym, id } = useLocalSearchParams<{ sym?: string; id?: string }>();
  const { chain } = useChain();
  const { colors } = useTheme();
  const targetSym = sym ?? id ?? "";
  const p = poolOf(chain, targetSym);
  const l = p ? lendOf(chain, p.sym) : null;
  const pos = l ? balTok(l) : 0;
  const tabs: [T, string][] = [
    ["position", "Position"],
    ["details", "Details"],
    ["activity", "Activity"],
    ["collateral", "Collateral"],
    ["analytics", "Analytics"],
  ];
  const [tab, setTab] = useState<T>("position");
  const cur = tabs.some(([k]) => k === tab) ? tab : "position";

  if (!p)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="" />
        <View style={{ padding: 16 }}>
          <EmptyCard title="Vault not found" module="earn" always />
        </View>
      </View>
    );

  // Everything below is read from the chain (chain/live.ts); "—" until the first read lands, never sample numbers.
  const free = freeTok(p), live = !!p.live, D = "—";
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title="" />
      <AfterTransition>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.vh}>
            <TokenLogo sym={p.sym} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sym, { color: colors.text }]}>{p.sym}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.apy, { color: colors.positive }]}>{live ? pct(p.supA) : D}</Text>
              <Text style={[styles.cap, { color: colors.muted }]}>Supply APY</Text>
            </View>
          </View>
          <Pairs
            items={[
              { label: "Total supply", value: live ? cNum(p.sup) : D, sub: live ? cUsd(p.sup * px(p.sym)) : undefined },
              { label: "Available", value: live ? cNum(free) : D, sub: live ? cUsd(free * px(p.sym)) : undefined },
              { label: "Utilization", value: live ? pct(p.util, 2) : D },
            ]}
          />
        </Card>
        <PillTabs items={tabs} value={cur} onChange={setTab} color={families.earn.tab} />
        <Swap k={cur}>
          <View style={{ gap: 12 }}>
            {cur === "position" && (pos > 0 ? <Position p={p} chain={chain} pos={pos} /> : <EmptyPosition p={p} />)}
            {cur === "details" && <PoolDetails p={p} />}
            {cur === "activity" && <PoolActivity p={p} rows={ACTIVITY[chain].filter((r) => r.area === "Earn" && r.sym === p.sym)} />}
            {cur === "collateral" && <Collateral p={p} chain={chain} />}
            {cur === "analytics" && <PoolAnalytics p={p} />}
          </View>
        </Swap>
      </ScrollView>
      </AfterTransition>
      <View style={[styles.foot, { backgroundColor: colors.bg, borderTopColor: colors.divider }]}>
        {pos > 0 && <Button label="Withdraw" v="outline" style={{ flex: 1 }} onPress={() => openAmount(chain, p.sym, "withdraw")} />}
        <Button label="Supply" fam={families.earn} style={{ flex: 1 }} onPress={() => openAmount(chain, p.sym, "supply")} />
      </View>
    </View>
  );
}

// The position's value with its share button, then one row: Supplied, Shares, Interest earned (website fT amounts). Values that do
// not fit shrink together: each cell's width follows its content, and a squeezed cell scales its value down (to 82%).
function Position({ p, chain, pos }: { p: Pool; chain: Chain; pos: number }) {
  const { colors } = useTheme();
  const l = lendOf(chain, p.sym), rate = shareRate(chain, p.sym), price = px(p.sym);
  const shares = l?.shares ?? (rate ? pos / rate : null);
  const earned = Math.max(0, l?.earned ?? 0), unknown = !!l?.earnedUnknown;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={[styles.big, { color: colors.text, flex: 1 }]}>{usd(pos * price)}</Text>
        <IconAction icon={shareIcon} label={`Share ${p.sym} position`} onPress={() => openShare({ kind: "earn", id: p.sym })} />
      </View>
      <View style={[styles.strip, { borderTopColor: colors.divider }]}>
        <Cell label="Supplied" value={`${fT(pos)} ${p.sym}`} />
        <View style={[styles.dv, { backgroundColor: colors.divider }]} />
        <Cell label="Shares" value={shares === null ? "—" : `${fT(shares)} ${shareSym(p.sym)}`} />
        <View style={[styles.dv, { backgroundColor: colors.divider }]} />
        <Cell label="Interest earned" value={unknown ? "—" : `${fT(earned)} ${p.sym}`} sub={unknown ? undefined : usd(earned * price)} />
      </View>
    </Card>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.cell}>
      <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.cv, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{value}</Text>
      {sub != null && <Text style={[styles.cap, { color: colors.muted, fontVariant: ["tabular-nums"] }]} numberOfLines={1}>{sub}</Text>}
    </View>
  );
}

// No position yet: the awake chameleon and one line from the pool's real supply APY (a tiny rate reads "under 0.01%", a zero one
// explains it starts once margin accounts borrow). The footer's Supply button is the action. Until the account has been read it shows
// the shared loading state instead of claiming there is nothing.
function EmptyPosition({ p }: { p: Pool }) {
  const { colors } = useTheme();
  const read = useAccountRead("solana");
  if (read !== "ready") return <EmptyCard title="No position yet" module="earn" />;
  const v = p.supA, rate = (t: string) => <Text style={{ fontFamily: font.semibold, color: colors.positive }}>{t}</Text>;
  return (
    <Card style={styles.empty}>
      <MascotBody width={112} module="earn" />
      <Text style={[styles.et, { color: colors.text }]}>No position yet</Text>
      {p.live && (
        <Text style={[styles.el, { color: colors.muted }]}>
          {v > 0 ? (
            <>Supply {p.sym} to earn {rate(v < 0.01 ? "under 0.01%" : pct(v))} a year, added every second.</>
          ) : (
            <>Supply {p.sym} to earn interest once margin accounts borrow it. Today&apos;s rate is {rate("0.00%")}.</>
          )}
        </Text>
      )}
    </Card>
  );
}

function Collateral({ p, chain }: { p: Pool; chain: Chain }) {
  const { colors } = useTheme();
  const rows = collList(chain);
  const supCap = p.supCap, borCap = p.borCap;
  return (
    <>
      {/* Cap usage only when the reserve has a cap (on the fork every cap is unlimited). */}
      {p.live && (typeof supCap === "number" || typeof borCap === "number") && (
        <Card>
          {typeof supCap === "number" && <CapUsage label="Supply cap usage" usedL="Supplied" used={p.sup} cap={supCap} s={p.sym} />}
          {typeof borCap === "number" && <CapUsage label="Borrow cap usage" usedL="Borrowed" used={p.bor} cap={borCap} s={p.sym} />}
        </Card>
      )}
      <Text style={[styles.st, { color: colors.text }]}>Assets on a margin account</Text>
      <Card style={{ gap: 0, paddingVertical: 8 }}>
        <View style={styles.ch}>
          {["Asset", "Max LTV", "Borrow", "Liq. bonus"].map((h, i) => (
            <Text key={h} style={[styles.cap, { color: colors.muted, flex: i === 0 ? 1 : 0, width: i === 0 ? undefined : 72, textAlign: i === 0 ? "left" : "center" }]}>
              {h}
            </Text>
          ))}
        </View>
        {rows.length === 0 && <Text style={[styles.cap, { color: colors.muted, paddingVertical: 12 }]}>Collateral settings unavailable right now</Text>}
        {rows.map(([s, c, b, lb, ltv]) => (
          <View key={s} style={styles.cr}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TokenLogo sym={s} size={28} />
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{s}</Text>
            </View>
            <Text style={{ width: 72, textAlign: "center", fontFamily: font.semibold, fontSize: 14, color: c ? colors.text : colors.muted }}>{c ? pct(ltv, 0) : "—"}</Text>
            <View style={{ width: 72, alignItems: "center" }}>
              {b ? <Icon name="check_circle" size={18} color={colors.positive} filled /> : <Text style={{ color: colors.muted }}>—</Text>}
            </View>
            <Text style={{ width: 72, textAlign: "center", fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{pct(lb, lb % 1 ? 1 : 0)}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function CapUsage({ label, usedL, used, cap, s }: { label: string; usedL: string; used: number; cap: number; s: string }) {
  const { colors } = useTheme();
  const u = cap ? (used / cap) * 100 : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.frl, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.frv, { color: colors.text }]}>{pct(u, 1)}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.segment, overflow: "hidden" }}>
        <View style={{ width: `${Math.min(100, u)}%`, height: 6, backgroundColor: colors.positive }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.cap, { color: colors.muted }]}>{usedL} {cNum(used)} {s}</Text>
        <Text style={[styles.cap, { color: colors.muted }]}>Cap {cNum(cap)} {s}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  vh: { flexDirection: "row", alignItems: "center", gap: 12 },
  sym: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  apy: { fontFamily: font.semibold, fontSize: 32, lineHeight: 40, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  big: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32, fontVariant: ["tabular-nums"] },
  st: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, marginTop: 4, marginBottom: -4 },
  strip: { flexDirection: "row", alignItems: "flex-start", borderTopWidth: 1, paddingTop: 12 },
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: "auto", minWidth: 0, gap: 2 },
  cv: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums", "no-contextual"] },
  dv: { width: 1, alignSelf: "stretch", marginHorizontal: 10 },
  empty: { alignItems: "center", gap: 8, paddingTop: 24, paddingBottom: 16 },
  et: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, marginTop: 4 },
  el: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 280 },
  frl: { flex: 1, fontFamily: font.regular, fontSize: 14 },
  frv: { fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  ch: { flexDirection: "row", alignItems: "center", minHeight: 32 },
  cr: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  foot: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
});
