import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Hero } from "@/components/hero";
import { PillTabs, SubTabs, Swap } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { Card, EmptyCard } from "@/components/ui/kit";
import { sUsd, usd } from "@/format";
import { ACTIVITY } from "@/sample/data";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";

import { BetList, betRows, openLinked } from "./bets";
import {
  byChance, CATS, EV, refreshLivePredict, type Ev, mainOuts, type Out, p2, pc, openPos, P, pmx, resPos, single, summary, team, usdC, whenOf, yourApy, posTitle, worldIdle, startSpec, holdx,
} from "./model";
import { openMarket } from "./nav";
import { onTabRequest, openTrade, runClaim, runSpec } from "./trade";
import { Chip, EarnLine, EvIcon, QBtn, TeamLogo } from "./ui";

/* Predict (design screens/predict.js, Solana only): Markets | My bets | History. Positions earn the pairing yield while open.
   The event page is the route src/app/(tabs)/lend/market/[id].tsx (screens/predict/event.tsx). */
export type PredictTab = "markets" | "positions" | "history";

export function PredictHero() {
  useDataVersion();
  useEffect(() => {
    void refreshLivePredict().catch(() => {});
  }, []);
  const sm = summary(), gain = sm.value - sm.cost;
  if (!sm.count && !sm.resolved)
    return <Hero label="Predictions value" value={usd(0)} stats={[{ label: "Cash", value: usd(sm.cash) }, { label: "In pool", value: "—" }, { label: "Pays if right", value: "—" }]} />;
  return (
    <Hero
      label="Predictions value"
      value={usd(sm.value)}
      under={
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Icon name={gain >= 0 ? "trending_up" : "trending_down"} size={14} color={gain >= 0 ? "#32EEE2" : "#FF8AC2"} />
            <Text style={styles.chipT}>{Math.abs(gain) < 0.005 ? `Cost ${usd(sm.cost)}` : `${sUsd(gain)} on ${usd(sm.cost)}`}</Text>
          </View>
          <View style={styles.chip}>
            <Icon name="savings" size={14} color="#FFFFFF" />
            <Text style={styles.chipT}>Earned {sUsd(sm.earned)}</Text>
          </View>
        </View>
      }
      stats={[
        { label: "Cash", value: usd(sm.cash) },
        { label: "In pool", value: usd(sm.inVault) },
        { label: "Pays if right", value: usd(sm.payout) },
      ]}
    />
  );
}

export function Predict({ tab, setTab }: { tab: PredictTab; setTab: (t: PredictTab) => void }) {
  useDataVersion();
  // a finished transaction's "View my bets" asks for the My bets tab
  useEffect(() => onTabRequest(() => setTab("positions")), [setTab]);
  return (
    <View style={{ gap: 12 }}>
      <SubTabs items={[["markets", "Markets"], ["positions", "My bets"], ["history", "History"]]} value={tab} onChange={setTab} fam={families.predict} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>{tab === "markets" ? <Markets /> : tab === "positions" ? <Bets onBrowse={() => setTab("markets")} /> : <PredictHistory />}</View>
      </Swap>
    </View>
  );
}

/* ---------- Markets ---------- */
function Markets() {
  const { colors } = useTheme();
  const [cat, setCat] = useState("trending");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    let l = EV.slice();
    if (cat !== "trending" && cat !== "all") l = l.filter((e) => e.cat === cat);
    if (cat === "trending") l = l.sort((a, b) => b.v24 - a.v24);
    const k = q.trim().toLowerCase();
    if (k) l = l.filter((e) => (e.title + " " + e.tag + " " + e.outs.map((o) => o.name).join(" ")).toLowerCase().includes(k));
    return l;
  }, [cat, q]);
  const held = openPos().length || P.hold.length;
  return (
    <>
      <ClaimCards />
      <IdleCard />
      {!held && <EarnLine />}
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={20} color="muted" />
        <TextInput value={q} onChangeText={setQ} placeholder="Search markets" placeholderTextColor={colors.muted} returnKeyType="search" autoCorrect={false} accessibilityLabel="Search markets" style={[styles.searchIn, { color: colors.text }]} />
        {!!q && (
          <Pressable onPress={() => setQ("")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search"><Icon name="close" size={18} color="muted" /></Pressable>
        )}
      </View>
      <PillTabs items={CATS as [string, string][]} value={cat} onChange={setCat} color={families.predict.tab} />
      {list.length ? list.map((e) => <MarketCard key={e.id} e={e} />) : <EmptyCard title={q ? "No markets match" : "No markets here yet"} module="predict" />}
    </>
  );
}

function ClaimCards() {
  const { colors } = useTheme();
  const rs = resPos().map((p) => [p, pmx(p)] as const).filter(([, m]) => m.won);
  return (
    <>
      {rs.map(([p, m]) => (
        <Card key={p.id}>
          <View style={styles.row}>
            <View style={[styles.cli, { backgroundColor: colors.tealTint }]}><Icon name="workspace_premium" size={22} color={colors.onTealTint} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.b, { color: colors.text }]}>You won {usd(m.claim)}</Text>
              <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{posTitle(m.e, m.o)}</Text>
            </View>
            <Button label="Claim" size="md" fam={families.predict} onPress={() => runClaim(p.id)} />
          </View>
        </Card>
      ))}
    </>
  );
}

function IdleCard() {
  const { colors } = useTheme();
  const idle = worldIdle();
  if (!idle.length) return null;
  const v = idle.reduce((t, h) => t + holdx(h).value, 0), ws = [...new Set(idle.map((h) => P.wallets.find((w) => w.id === h.wallet)?.name).filter(Boolean))];
  return (
    <Card>
      <View style={styles.row}>
        <View style={[styles.cli, { backgroundColor: colors.bg }]}><Icon name="savings" size={22} color={colors.text} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.b, { color: colors.text }]}>{idle.length} not earning</Text>
          <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{usd(v)}, {ws.join(", ") || "your wallet"}</Text>
        </View>
        <Button label="Start earning" size="md" fam={families.predict} onPress={() => runSpec(startSpec(idle.map((h) => h.id)))} />
      </View>
    </Card>
  );
}

function MarketCard({ e }: { e: Ev }) {
  const { colors } = useTheme();
  const ops = mainOuts(e), bin = single(e), o0 = ops[0];
  const rows = e.type === "match" ? ops : ops.slice().sort(byChance).slice(0, 2), more = ops.length - rows.length;
  const mine = openPos().filter((p) => p.ev === e.id).map(pmx);
  const claim = resPos().filter((p) => p.ev === e.id).map(pmx).filter((m) => m.won).reduce((t, m) => t + m.claim, 0);
  return (
    <View>
      <Card>
        <Pressable onPress={() => openMarket(e.id)} accessibilityRole="button" accessibilityLabel={e.title} style={styles.row}>
          <EvIcon e={e} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={[styles.row, { gap: 6 }]}>
              <Chip label={e.tag} tone="blue" />
              {e.live && <Chip label="Live" tone="pink" />}
              <Text style={[styles.cap, { color: colors.muted, flexShrink: 1 }]} numberOfLines={1}>{e.live ? `${e.score}, ${e.when}` : whenOf(e)}</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{e.title}</Text>
          </View>
          {bin && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.lg, { color: colors.text }]}>{pc(o0.y)}</Text>
              <Text style={[styles.cap, { color: colors.muted }]}>{e.type === "updown" ? "Up" : "chance"}</Text>
            </View>
          )}
        </Pressable>
        {bin ? (
          <View style={styles.row}>
            <QBtn e={e} o={o0} side="yes" wide onPress={() => openTrade(e, o0, "yes")} />
            <QBtn e={e} o={o0} side="no" wide onPress={() => openTrade(e, o0, "no")} />
          </View>
        ) : (
          rows.map((o) => <MarketRow key={o.k} e={e} o={o} />)
        )}
        <Pressable onPress={() => openMarket(e.id)} accessibilityRole="button" accessibilityLabel={`${e.title} details`} style={[styles.row, { justifyContent: "space-between" }]}>
          <Text style={[styles.cap, { color: colors.muted }]}>{usdC(e.vol)} Vol{more > 0 ? `, +${more}` : ""}</Text>
          {claim > 0 ? <Chip label={`Won, claim ${usd(claim)}`} tone="teal" icon="check_circle" /> : mine.length > 0 ? <Chip label={p2(yourApy(mine.map((m) => ({ value: m.value, apy: m.sd.apy }))))} tone="blue" icon="savings" /> : null}
        </Pressable>
      </Card>
    </View>
  );
}

function MarketRow({ e, o }: { e: Ev; o: Out }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { minHeight: 44 }]}>
      {team(o) && <TeamLogo o={o} size={24} />}
      <Text style={[styles.b, { color: colors.text, flex: 1 }]} numberOfLines={1}>{o.name}</Text>
      <Text style={[styles.b, { color: colors.text, width: 40, textAlign: "right", fontVariant: ["tabular-nums"] }]}>{pc(o.y)}</Text>
      <QBtn e={e} o={o} side="yes" onPress={() => openTrade(e, o, "yes")} />
      <QBtn e={e} o={o} side="no" onPress={() => openTrade(e, o, "no")} />
    </View>
  );
}

/* ---------- My bets: To claim | Open | Linked wallets ---------- */
function Bets({ onBrowse }: { onBrowse: () => void }) {
  const { colors } = useTheme();
  const won = betRows((r) => r.kind === "pool" && r.res), open = betRows((r) => r.kind === "pool" && !r.res), linked = betRows((r) => r.kind === "hold");
  if (!won.length && !open.length && !linked.length) return <EmptyCard title="No bets yet" action="Browse markets" onAction={onBrowse} module="predict" />;
  const sec = (t: string, rows: ReturnType<typeof betRows>, extra?: React.ReactNode) =>
    rows.length ? (
      <>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={[styles.sec, { color: colors.text }]}>{t}</Text>
          <Text style={[styles.cap, { color: colors.muted, flex: 1 }]}>{rows.length}</Text>
          {extra}
        </View>
        <BetList rows={rows} />
      </>
    ) : null;
  return (
    <>
      {sec("To claim", won)}
      {sec("Open", open)}
      {sec("Linked wallets", linked, <Pressable onPress={() => openLinked("main")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Manage linked wallets"><Icon name="tune" size={22} color="muted" /></Pressable>)}
      {!linked.length && (
        <Pressable onPress={() => openLinked("add")} accessibilityRole="button">
          <Card>
            <View style={styles.row}>
              <Icon name="add" size={20} />
              <Text style={[styles.b, { color: colors.text }]}>Link a wallet</Text>
              <Text style={[styles.cap, { color: colors.muted }]}>World, Polymarket</Text>
            </View>
          </Card>
        </Pressable>
      )}
    </>
  );
}

/* ---------- History: grouped by day ---------- */
const HIC: Record<string, IconName> = { Buy: "add", Sell: "remove", Claim: "workspace_premium", "Start earning": "savings", Withdraw: "arrow_downward", Pairing: "link", Move: "swap_horiz" };
function PredictHistory() {
  const { colors } = useTheme();
  const rows = ACTIVITY.solana.filter((r) => r.area === "Predict");
  if (!rows.length) return <EmptyCard title="No activity yet" module="predict" />;
  const groups: [string, typeof rows][] = [];
  rows.forEach((r) => { const d = r.t.split(",")[0], g = groups.find((x) => x[0] === d); if (g) g[1].push(r); else groups.push([d, [r]]); });
  return (
    <>
      {groups.map(([d, list]) => (
        <Card key={d} style={{ gap: 0 }}>
          <Text style={[styles.cap, { color: colors.muted, fontFamily: font.semibold, paddingBottom: 4 }]}>{d}</Text>
          {list.map((r, i) => {
            const plus = (r.usd ?? 0) > 0.005, zero = Math.abs(r.usd ?? 0) < 0.005;
            return (
              <View key={r.tx + i} style={[styles.row, { minHeight: 60 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                <View style={[styles.hic, { backgroundColor: colors.bg }]}><Icon name={HIC[r.action] ?? "how_to_vote"} size={18} /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.b, { color: colors.text }]} numberOfLines={2}>{r.detail}</Text>
                  <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{r.amt}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.b, { color: plus ? colors.positive : colors.text, fontVariant: ["tabular-nums"] }]}>{zero ? "—" : (plus ? "+" : "−") + usd(Math.abs(r.usd ?? 0))}</Text>
                  <Text style={[styles.cap, { color: colors.muted }]}>{r.t.split(", ")[1] ?? ""}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)" },
  chipT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  b: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  title: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  lg: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  sec: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24 },
  cli: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hic: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, height: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1 },
  searchIn: { flex: 1, fontFamily: font.regular, fontSize: 15, paddingVertical: 0 },
});
