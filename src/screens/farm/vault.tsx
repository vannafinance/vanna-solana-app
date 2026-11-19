import { StatusBar } from "expo-status-bar";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { SubTabs, Swap } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { openExplorer } from "@/components/history";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, shareIcon } from "@/components/ui/kit";
import { nf, pct, usd } from "@/format";
import { ACTIVITY, DATA } from "@/sample/data";
import { type Chain, useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { AfterTransition } from "@/ui/ready";
import { openShare } from "@/screens/share/share";

import { apyText, openFarm, posOf, px, usdC, type Vault, VAULTS, valOf } from "./farm";
import { KAM_X, PER_X } from "./vault-model";

/* Farm vault detail (design SCREENS['farm-vault'] and ['farm-position'], one screen): header "<venue> lending" / "Perena vault", the vault's icon, name and venue chips, a stats grid, Your position | Analytics, How it works, and
   Withdraw / Supply pinned below. The footer opens the same deposit / withdraw sheet the vault cards used to open. */
type Kind = "kam" | "per";
const kindOf = (v: Vault): Kind => (v.venue === "Perena" ? "per" : "kam");
const LAB: Record<Kind, (v: Vault) => string> = { kam: () => "Kamino lending", per: () => "Perena vault" };
const DL: Record<Kind, string> = { kam: "Supply", per: "Deposit" };
const WL: Record<Kind, string> = { kam: "Withdraw", per: "Withdraw" };
const VSYM: Record<string, string> = { Kamino: "KMNO", Perena: "PERENA" };
const perKey = (id: string) => (id === "junior" ? "junior" : "usdstar");

export default function FarmVaultScreen({ id }: { id: string }) {
  useDataVersion();
  const { chain } = useChain();
  const { colors } = useTheme();
  const v = VAULTS[chain].find((x) => x.id === id);
  const [tab, setTab] = useState<"pos" | "an">("pos");

  if (!v)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Farm" />
        <View style={{ padding: 16 }}>
          <EmptyCard title="Vault not found" module="farm" always />
        </View>
      </View>
    );

  const k = kindOf(v), fam = families.farm;
  const pos = posOf(DATA[chain], v.id), has = !!pos && valOf(pos) > 0.005;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title={LAB[k](v)} />
      <AfterTransition>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.pph}>
            <TokenLogo sym={v.icon} size={44} />
            <View style={{ flex: 1, minWidth: 0, gap: 6, alignItems: "flex-start" }}>
              <Text style={[styles.h, { color: colors.text }]} numberOfLines={1}>{v.name}</Text>
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: colors.pinkTint }]}>
                  <TokenLogo sym={VSYM[v.venue] ?? v.venue} size={18} />
                  <Text style={[styles.chipT, { color: colors.onPinkTint }]}>{v.venue}</Text>
                </View>
              </View>
            </View>
          </View>
          <Stats v={v} k={k} />
          <SubTabs items={[["pos", "Your position"], ["an", "Analytics"]]} value={tab} onChange={setTab} fam={fam} />
          <Swap k={tab}>
            <View style={{ gap: 12 }}>{tab === "pos" ? <YourPosition v={v} k={k} /> : <Analytics v={v} k={k} />}</View>
          </Swap>
          <HowItWorks v={v} k={k} />
        </ScrollView>
      </AfterTransition>
      <View style={[styles.foot, { backgroundColor: colors.bg, borderTopColor: colors.divider }]}>
        <Button label={WL[k]} v="outline" disabled={!has} style={{ flex: 1 }} onPress={() => openFarm(chain, v, "withdraw")} />
        <Button label={DL[k]} fam={families.farm} style={{ flex: 1 }} onPress={() => openFarm(chain, v, "deposit")} />
      </View>
    </View>
  );
}

/* ---------- stats grid (design poolStats) ---------- */
// Live values only (live.ts): "—" when a figure has not arrived. Kamino: its main-market API. Perena: the fork's share price and
// TVL (share supply x share price, read on chain), holders from Perena's API.
const opt = (n: number | undefined, f: (n: number) => string) => (n === undefined || !isFinite(n) ? "—" : f(n));
function Stats({ v, k }: { v: Vault; k: Kind }) {
  const { colors } = useTheme();
  const items: [string, string, ("pos" | "neg" | "")?, string?][] = (() => {
    if (k === "kam") return [["Supply APY", apyText(v), "pos"], ["Borrow APY", opt(v.borrowApy, (n) => pct(n))], ["Utilization", opt(v.util, (n) => pct(n))], ["Total supply", opt(v.supplyUsd, usdC)]];
    return [["APY 7D", apyText(v), "pos"], ["Share price", opt(v.sharePrice, (n) => "$" + nf(n, 6))], ["Holders", opt(v.holders, (n) => nf(n, 0))], ["TVL", opt(v.tvlUsd, usdC)]];
  })();
  return (
    <View style={[styles.stats, { backgroundColor: colors.divider }]}>
      {[items.slice(0, 2), items.slice(2)].map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", gap: 1 }}>
          {row.map(([l, val, c, s]) => (
            <View key={l} style={[styles.st, { backgroundColor: colors.surface }]}>
              <Text style={[styles.stl, { color: colors.muted }]} numberOfLines={1}>{l}</Text>
              <Text style={[styles.stv, { color: c === "pos" ? colors.positive : c === "neg" ? colors.negative : colors.text }]} numberOfLines={1}>{val}</Text>
              {s ? <Text style={[styles.stl, { color: colors.muted }]} numberOfLines={1}>{s}</Text> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ---------- Your position ---------- */
function receipt(v: Vault, k: Kind, totalTok: number, valUsd: number): [string, string] {
  if (k === "per") return [v.sharePrice ? nf(valUsd / v.sharePrice, 2) : "—", PER_X[perKey(v.id)].rc];
  return [nf(totalTok, totalTok >= 0.01 ? 2 : 4), KAM_X[v.id]?.rc ?? v.sym];
}

// Activity rows for this vault (the sheet writes "<name> on <venue>"; older rows are matched from their text).
function vaultRows(chain: Chain, v: Vault) {
  return ACTIVITY[chain].filter((r) => {
    if (r.area !== "Farm") return false;
    const t = `${r.detail} ${r.via ?? ""}`;
    if (v.venue === "Kamino") return /kamino/i.test(t) && new RegExp(`\\b${v.sym}\\b`).test(t);
    return /perena|usd\*/i.test(t) && (v.id === "junior" ? /junior/i.test(t) : !/junior/i.test(t));
  });
}

function YourPosition({ v, k }: { v: Vault; k: Kind }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const pos = posOf(DATA[chain], v.id), val = pos ? valOf(pos) : 0, rows = vaultRows(chain, v);
  if (!pos || val <= 0) {
    if (!rows.length) return <EmptyCard title="No position yet" module="farm" />;
  }
  let card: ReactNode = null;
  if (pos && val > 0) {
    // No value history: the app has no source for it, so only today's figures are shown (no chart).
    const earned = pos.earned * px(pos.sym), rc = receipt(v, k, pos.amt + pos.earned, val);
    card = (
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <View style={styles.strip}>
            {([["Value", usd(val), ""], ["Earned", "+" + usd(earned), "pos"], ["Receipt", rc[0], "", rc[1]]] as [string, string, string, string?][]).map(([l, x, c, s]) => (
              <View key={l} style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.stl, { color: colors.muted }]}>{l}</Text>
                <Text style={[styles.stv, { fontSize: 16, color: c === "pos" ? colors.positive : colors.text }]} numberOfLines={1}>{x}</Text>
                {s ? <Text style={[styles.stl, { color: colors.muted }]} numberOfLines={1}>{s}</Text> : null}
              </View>
            ))}
          </View>
          <IconAction icon={shareIcon} label={`Share ${v.name}`} onPress={() => openShare({ kind: "farm", id: v.id })} />
        </View>
      </Card>
    );
  }
  return (
    <>
      {card}
      {rows.length > 0 && (
        <Card>
          <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
          {rows.map((r, i) => (
            <View key={i} style={[styles.txr, { borderTopColor: colors.divider }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.b14, { color: colors.text }]}>{r.action}</Text>
                <Text style={[styles.stl, { color: colors.muted }]}>{r.t}</Text>
              </View>
              <Text style={[styles.b14, { color: colors.text }]}>{r.amt}</Text>
              {r.hash ? <IconAction icon="open_in_new" label="View on explorer" tone="plain" onPress={() => openExplorer(r)} /> : null}
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

/* ---------- Analytics ---------- */
function Analytics({ v, k }: { v: Vault; k: Kind }) {
  return k === "kam" ? <KamAnalytics v={v} /> : <PerAnalytics v={v} />;
}

function Tiles({ items }: { items: [string, string, string?, string?][] }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.tiles}>
      {items.map(([l, x, c, s]) => (
        <View key={l} style={[styles.tile, { backgroundColor: colors.surface }, !isDark && styles.shadow]}>
          <Text style={[styles.stl, { color: colors.muted }]} numberOfLines={1}>{l}</Text>
          <Text style={[styles.stv, { fontSize: 16, color: c === "pos" ? colors.positive : c === "neg" ? colors.negative : colors.text }]} numberOfLines={1}>{x}</Text>
          {s ? <Text style={[styles.stl, { color: colors.muted }]} numberOfLines={1}>{s}</Text> : null}
        </View>
      ))}
    </View>
  );
}

// Live figures only. Rate and share-price history (and the 30-day APY, ROI and drawdown built from it) come from the web's own
// server records, which the app has no source for, so they are not shown.
function KamAnalytics({ v }: { v: Vault }) {
  const liq = v.supplyUsd !== undefined && v.borrowUsd !== undefined ? v.supplyUsd - v.borrowUsd : undefined;
  return <Tiles items={[["Borrowed", opt(v.borrowUsd, usdC)], ["Liquidity", opt(liq, usdC)], ["Supply APY", apyText(v), "pos"], ["Borrow APY", opt(v.borrowApy, (n) => pct(n))]]} />;
}

function PerAnalytics({ v }: { v: Vault }) {
  const { colors } = useTheme();
  const p = PER_X[perKey(v.id)], [tip, setTip] = useState(false);
  return (
    <>
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>{p.rc}</Text>
          <InfoBtn on={tip} onPress={() => setTip(!tip)} />
        </View>
        {tip && <Text style={[styles.tip, { color: colors.muted }]}>{`${p.who}. No lockup. Vanna values ${p.rc} at the share price read on its fork, which can lag Perena's mainnet price.`}</Text>}
      </Card>
      <Tiles
        items={[
          ["Share price (Vanna)", opt(v.sharePrice, (n) => "$" + nf(n, 6))],
          ["Perena price", opt(v.perenaPrice, (n) => "$" + nf(n, 6))],
          ["TVL", opt(v.tvlUsd, usdC)],
          ["Holders", opt(v.holders, (n) => nf(n, 0))],
          ["Exit fee", p.exitFee],
        ]}
      />
    </>
  );
}

/* ---------- How it works ---------- */
const HOW: Record<Kind, (v: Vault) => [string, string?][]> = {
  kam: (v) => [["Supply from your margin account", `${v.sym} already in your margin account goes to Kamino`], ["Earn Kamino supply yield", "The receipt stays in your margin account and counts toward its health factor"], ["Withdraw anytime", "Back into your margin account"]],
  per: (v) => [["Deposit USDC from your margin account", `Perena issues ${PER_X[perKey(v.id)].rc} at its share price`], ["Earn the share price", "The receipt counts toward your health factor"], ["Withdraw anytime", "No lockup, back to USDC"]],
};
function HowItWorks({ v, k }: { v: Vault; k: Kind }) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.how, { backgroundColor: colors.surface }, !isDark && styles.shadow]}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.howH}>
        <Text style={[styles.b14, { color: colors.text, flex: 1 }]}>How it works</Text>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <Icon name="expand_more" size={20} />
        </View>
      </Pressable>
      {open && (
        <View style={{ paddingBottom: 12 }}>
          {HOW[k](v).map(([b, sub], i) => (
            <View key={b} style={{ flexDirection: "row", gap: 12, paddingVertical: 8 }}>
              <View style={[styles.num, { backgroundColor: colors.pinkTint }]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.onPinkTint }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.b14, { color: colors.text }]}>{b}</Text>
                {sub ? <Text style={[styles.stl, { color: colors.muted }]}>{sub}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ---------- small controls ---------- */
function InfoBtn({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="About this" accessibilityState={{ expanded: on }}>
      <Icon name="info" size={18} color="muted" />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  foot: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
  pph: { flexDirection: "row", alignItems: "center", gap: 12 },
  h: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 26, paddingLeft: 4, paddingRight: 10, borderRadius: 13 },
  chipT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  stats: { gap: 1, borderRadius: 12, overflow: "hidden" },
  st: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  stl: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  stv: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, fontVariant: ["tabular-nums"] },
  strip: { flex: 1, flexDirection: "row", gap: 12 },
  ctl: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  title: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  b14: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums"] },
  txr: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48.5%", flexGrow: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  shadow: { shadowColor: "#111111", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  chh: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 32 },
  tip: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  rng: { minWidth: 44, height: 32, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", padding: 2, borderRadius: 12, gap: 2, alignSelf: "flex-start", maxWidth: "100%" },
  segB: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  how: { borderRadius: 16, paddingHorizontal: 16 },
  howH: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
