import { StatusBar } from "expo-status-bar";
import { type ReactNode, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { SubTabs, Swap } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, shareIcon } from "@/components/ui/kit";
import { nf, pct, spct, usd } from "@/format";
import { ACTIVITY, DATA } from "@/sample/data";
import { type Chain, useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { AfterTransition } from "@/ui/ready";
import { openShare } from "@/screens/share/share";

import { openFarm, posOf, px, usdC, type Vault, VAULTS, valOf } from "./farm";
import { FarmChart } from "./vault-chart";
import { dayMs, dLbl, KAM_X, kamRates, N, PER_X, perSeries, posSeries } from "./vault-model";

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
          <EmptyCard title="Vault not found" module="farm" />
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
function Stats({ v, k }: { v: Vault; k: Kind }) {
  const { colors } = useTheme();
  const items: [string, string, ("pos" | "neg" | "")?, string?][] = (() => {
    if (k === "kam") {
      const x = KAM_X[v.id];
      return [["Supply APY", pct(v.apy), "pos"], ["Borrow APY", pct(v.borrowApy ?? x?.borA ?? 0)], ["Utilization", pct(v.util ?? x?.util ?? 0)], ["Total supply", usdC(v.supplyUsd ?? x?.depU ?? 0)]];
    }
    const p = PER_X[perKey(v.id)];
    return [["APY 7D", pct(v.apy), "pos"], ["Share price", "$" + nf(p.sp, 6)], ["Holders", nf(p.holders, 0)], ["TVL", usdC(p.tvl)]];
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
  if (k === "per") return [nf(valUsd / PER_X[perKey(v.id)].sp, 2), PER_X[perKey(v.id)].rc];
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
  const [mode, setMode] = useState<"val" | "earn">("val");
  const [range, setRange] = useState(N);
  if (!pos || val <= 0) {
    if (!rows.length) return <EmptyCard title="No position yet" module="farm" />;
  }
  let card: ReactNode = null;
  if (pos && val > 0) {
    const earned = pos.earned * px(pos.sym), rc = receipt(v, k, pos.amt + pos.earned, val);
    const s0 = posSeries(pos.since, pos.amt, pos.earned, px(pos.sym));
    const nn = Math.min(range, s0.val.length), from = s0.val.length - nn, start = N - nn, vals = s0.val.slice(from), earns = s0.earn.slice(from);
    const d = mode === "earn" ? earns : vals;
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
        <View style={styles.ctl}>
          <Seg opts={[["val", "Value"], ["earn", "Earned"]]} value={mode} onChange={setMode} />
          <Ranges value={range} onChange={setRange} />
        </View>
        {d.length >= 2 ? (
          <FarmChart
            data={d} zero={mode === "earn"} dates={d.map((_, i) => dayMs(start + i))} axis={(t, st) => "$" + nf(t, st < 1 ? 2 : 0)}
            read={(i) => `${dLbl(dayMs(start + i))}: value ${usd(vals[i])}, earned +${usd(earns[i])}`}
          />
        ) : (
          <Text style={[styles.stl, { color: colors.muted }]}>Chart starts tomorrow</Text>
        )}
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

const allDates = Array.from({ length: N }, (_, i) => dayMs(i));
const axPct = (t: number, st: number) => pct(t, st < 1 ? 1 : 0);

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

function KamAnalytics({ v }: { v: Vault }) {
  const { colors } = useTheme();
  const x = KAM_X[v.id], [r, setR] = useState(90);
  const bor = v.borrowUsd ?? x.borU, dep = v.supplyUsd ?? x.depU;
  const rt = useMemo(() => kamRates(x.dep, v.apy, v.borrowApy ?? x.borA), [x, v.apy, v.borrowApy]);
  const s = N - r, a = rt.sup.slice(s), b = rt.bor.slice(s);
  return (
    <>
      <Tiles items={[["Borrowed", usdC(bor)], ["Liquidity", usdC(dep - bor)], ["APY 30D", pct(rt.avg30)]]} />
      <Card>
        <Text style={[styles.title, { color: colors.text }]}>APY</Text>
        <View style={styles.ctl}><View /><Ranges value={r} onChange={setR} /></View>
        <FarmChart data={a} cmp={b} dates={allDates.slice(s)} axis={axPct} read={(i) => `${dLbl(dayMs(s + i))}: supply ${pct(a[i])}, borrow ${pct(b[i])}`} />
        <View style={{ flexDirection: "row", gap: 14 }}>
          <Legend label="Supply APY" />
          <Legend label="Borrow APY" dashed />
        </View>
      </Card>
    </>
  );
}

function PerAnalytics({ v }: { v: Vault }) {
  const { colors } = useTheme();
  const p = PER_X[perKey(v.id)], [r, setR] = useState(90), [tip, setTip] = useState(false);
  const d0 = useMemo(() => perSeries(p.sp, p.apy7, p.holders), [p]);
  const s = N - r, d = d0.slice(s);
  return (
    <>
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Share price</Text>
          <InfoBtn on={tip} onPress={() => setTip(!tip)} />
        </View>
        {tip && <Text style={[styles.tip, { color: colors.muted }]}>{`${p.who}. No lockup. USD per ${p.rc}, daily.`}</Text>}
        <View style={styles.ctl}><View /><Ranges value={r} onChange={setR} /></View>
        <FarmChart data={d} dates={allDates.slice(s)} axis={(t, st) => "$" + nf(t, Math.max(4, -Math.floor(Math.log10(st))))} read={(i) => `${dLbl(dayMs(s + i))}: $${nf(d[i], 6)} per ${p.rc}`} />
      </Card>
      <Tiles items={[["APY 30D", pct(p.rec30)], ["ROI", spct(p.roi, 3)], ["Max drawdown", pct(p.mdd, 3)], ["Perena price", "$" + nf(p.spP, 6)], ["Exit fee", "None"]]} />
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
function Ranges({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4 }} accessibilityRole="radiogroup">
      {([[7, "1W"], [30, "1M"], [90, "3M"], [N, "All"]] as const).map(([d, l]) => {
        const on = value === d;
        return (
          <Pressable key={l} onPress={() => onChange(d)} hitSlop={6} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.rng, { backgroundColor: on ? colors.pinkTint : "transparent", borderColor: on ? "transparent" : colors.border }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: on ? colors.onPinkTint : colors.muted }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function Seg<K extends string>({ opts, value, onChange }: { opts: [K, string][]; value: K; onChange: (k: K) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.seg, { backgroundColor: colors.segment }]} accessibilityRole="tablist">
      {opts.map(([k, l]) => {
        const on = k === value;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.segB, on && { backgroundColor: colors.segmentActive }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? colors.text : colors.muted }}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function InfoBtn({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="About this" accessibilityState={{ expanded: on }}>
      <Icon name="info" size={18} color="muted" />
    </Pressable>
  );
}
function Legend({ label, dashed }: { label: string; dashed?: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: dashed ? "dashed" : "solid", borderColor: dashed ? colors.muted : isDark ? "#FF54A6" : "#E8006F" }} />
      <Text style={[styles.stl, { color: colors.muted }]}>{label}</Text>
    </View>
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
