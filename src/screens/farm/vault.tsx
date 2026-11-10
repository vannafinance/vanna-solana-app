import { StatusBar } from "expo-status-bar";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchFundingDays } from "@/chain/solana/farm";
import { TokenLogo } from "@/components/brand";
import { SubTabs, Swap } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { Card, EmptyCard, IconAction, shareIcon, Tag } from "@/components/ui/kit";
import { nf, pct, spct, usd } from "@/format";
import { ACTIVITY, DATA, POOLS_BY } from "@/sample/data";
import { useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { AfterTransition } from "@/ui/ready";
import { openShare } from "@/screens/share/share";

import { CATS, openFarm, posOf, px, usdC, type Vault, VAULTS, valOf } from "./farm";
import { FarmChart } from "./vault-chart";
import {
  avg, type Basis, BASIS_X, BLEND_X, blendSeries, buildBasis, dayMs, dLbl, HEDGE, KAM_X, kamRates, LP_X, monthly, N, PER_X, perSeries, posSeries,
} from "./vault-model";

/* Farm vault detail (design SCREENS['farm-vault'] and ['farm-position'], one screen): header "<venue> lending" / "Delta-neutral vault" /
   "Perena vault" / "LP pool", the vault's icon, name and venue chips, a stats grid, Your position | Analytics, How it works, and
   Withdraw / Supply pinned below. The footer opens the same deposit / withdraw sheet the vault cards used to open. */
type Kind = "kam" | "blend" | "dn" | "per" | "lp";
const kindOf = (v: Vault): Kind => (v.cat === "dn" ? "dn" : v.cat === "lp" ? "lp" : v.venue === "Perena" ? "per" : v.venue === "Blend" ? "blend" : "kam");
const LAB: Record<Kind, (v: Vault) => string> = { kam: () => "Kamino lending", blend: () => "Blend lending", dn: () => "Delta-neutral vault", per: () => "Perena vault", lp: () => "LP pool" };
const DL: Record<Kind, string> = { kam: "Supply", blend: "Supply", dn: "Deposit", per: "Deposit", lp: "Add" };
const WL: Record<Kind, string> = { kam: "Withdraw", blend: "Withdraw", dn: "Withdraw", per: "Withdraw", lp: "Remove" };
const VENUES = (v: Vault) => (v.venue === "Jupiter and Phoenix" ? ["Jupiter", "Phoenix"] : [v.venue]);
const VSYM: Record<string, string> = { Kamino: "KMNO", Jupiter: "JUP", Phoenix: "PHX", Perena: "PERENA", Blend: "BLEND", Soroswap: "SOROSWAP", Aquarius: "AQUARIUS" };
const perKey = (id: string) => (id === "junior" ? "junior" : "usdstar");

export default function FarmVaultScreen({ id }: { id: string }) {
  useDataVersion();
  const { chain, setChain } = useChain();
  const { colors } = useTheme();
  // A link can name a vault on the other chain (notification, share): switch to that chain rather than show "not found".
  const owner = (["solana", "stellar"] as const).find((c) => VAULTS[c].some((x) => x.id === id));
  useEffect(() => {
    if (owner && owner !== chain) setChain(owner);
  }, [owner, chain, setChain]);
  const v = owner === chain ? VAULTS[chain].find((x) => x.id === id) : undefined;
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

  const k = kindOf(v), fam = families[CATS[chain].find((c) => c[0] === v.cat)?.[2] ?? "farm"];
  const pos = posOf(DATA[chain], v.id), has = !!pos && valOf(pos) > 0.005;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title={LAB[k](v)} />
      <AfterTransition>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.pph}>
            <Icons v={v} k={k} size={44} />
            <View style={{ flex: 1, minWidth: 0, gap: 6, alignItems: "flex-start" }}>
              <Text style={[styles.h, { color: colors.text }]} numberOfLines={1}>{k === "lp" ? `${v.icon}/USDC` : v.name}</Text>
              <View style={styles.chips}>
                {VENUES(v).map((n) => (
                  <View key={n} style={[styles.chip, { backgroundColor: colors.pinkTint }]}>
                    <TokenLogo sym={VSYM[n] ?? n} size={18} />
                    <Text style={[styles.chipT, { color: colors.onPinkTint }]}>{n}</Text>
                  </View>
                ))}
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

function Icons({ v, k, size }: { v: Vault; k: Kind; size: number }) {
  if (k !== "lp") return <TokenLogo sym={v.icon} size={size} />;
  return (
    <View style={{ width: size * 1.55, height: size }}>
      <TokenLogo sym={v.icon} size={size} />
      <View style={{ position: "absolute", left: size * 0.62 }}>
        <TokenLogo sym={v.pair ?? "USDC"} size={Math.round(size * 0.78)} />
      </View>
    </View>
  );
}

/* ---------- stats grid (design poolStats) ---------- */
function Stats({ v, k }: { v: Vault; k: Kind }) {
  const { colors } = useTheme();
  const items: [string, string, ("pos" | "neg" | "")?, string?][] = (() => {
    if (k === "kam" || k === "blend") {
      const x = k === "kam" ? KAM_X[v.id] : BLEND_X[v.id];
      return [["Supply APY", pct(v.apy), "pos"], ["Borrow APY", pct(v.borrowApy ?? x?.borA ?? 0)], ["Utilization", pct(v.util ?? x?.util ?? 0)], ["Total supply", usdC(v.supplyUsd ?? x?.depU ?? 0)]];
    }
    if (k === "dn") {
      const b = BASIS_X[v.id], fn = v.fundingNow ?? buildBasis(b).fundingNow;
      return [["Vault APY 7D", pct(v.apy), "pos"], ["Funding now", spct(fn, 1), fn >= 0 ? "pos" : "neg"], ["Net delta", spct(b.delta, 2)], ["TVL", usdC(b.tvl), "", `of ${usdC(b.cap)} cap`]];
    }
    if (k === "per") {
      const p = PER_X[perKey(v.id)];
      return [["APY 7D", pct(v.apy), "pos"], ["Share price", "$" + nf(p.sp, 6)], ["Holders", nf(p.holders, 0)], ["TVL", usdC(p.tvl)]];
    }
    const p = LP_X[v.id];
    return [["Pool APR", pct(v.apy), v.apy > 0 ? "pos" : ""], ["Fee rate", pct(p.fee)], ["TVL", v.supplyUsd != null ? usd(v.supplyUsd) : "—"], ["Pool price", "$" + nf(p.rb / p.ra, 4), "", "USDC per XLM"]];
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

const lpTvl = (id: string) => {
  const p = LP_X[id];
  return p.ra * px("XLM") + p.rb * px(id === "soroswap-xlm" ? "SoUSDC" : "AqUSDC");
};
const lpSharePx = (id: string) => lpTvl(id) / LP_X[id].shares;

/* ---------- Your position ---------- */
function receipt(v: Vault, k: Kind, totalTok: number, valUsd: number, sp?: number[]): [string, string] {
  if (k === "dn") return [nf(valUsd / (sp?.[N - 1] || 1), 2), BASIS_X[v.id].share];
  if (k === "per") return [nf(valUsd / PER_X[perKey(v.id)].sp, 2), PER_X[perKey(v.id)].rc];
  if (k === "blend") return [nf(totalTok / BLEND_X[v.id].rate, 2), BLEND_X[v.id].rc];
  if (k === "lp") return [nf(valUsd / lpSharePx(v.id), 2), "LP shares"];
  return [nf(totalTok, totalTok >= 0.01 ? 2 : 4), KAM_X[v.id]?.rc ?? v.sym];
}

// Activity rows for this vault (the sheet writes "<name> on <venue>"; older rows are matched from their text).
function vaultRows(chain: "solana" | "stellar", v: Vault) {
  return ACTIVITY[chain].filter((r) => {
    if (r.area !== "Farm") return false;
    const t = `${r.detail} ${r.via ?? ""}`;
    if (v.venue === "Kamino") return /kamino/i.test(t) && new RegExp(`\\b${v.sym}\\b`).test(t);
    if (v.venue === "Blend") return /blend/i.test(t) && (v.id === "blend-xlm" ? /XLM/.test(t) : !/XLM/.test(t));
    if (v.venue === "Perena") return /perena|usd\*/i.test(t) && (v.id === "junior" ? /junior/i.test(t) : !/junior/i.test(t));
    if (v.cat === "lp") return new RegExp(v.venue, "i").test(t);
    return /phoenix|jupiter|basis/i.test(t) && new RegExp(`\\b${v.icon}\\b`).test(t);
  });
}

function YourPosition({ v, k }: { v: Vault; k: Kind }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const pos = posOf(DATA[chain], v.id), val = pos ? valOf(pos) : 0, rows = vaultRows(chain, v);
  const [mode, setMode] = useState<"val" | "earn">("val");
  const [range, setRange] = useState(N);
  const basis = useMemo(() => (k === "dn" ? buildBasis(BASIS_X[v.id]) : null), [k, v.id]);
  if (!pos || val <= 0) {
    if (!rows.length) return <EmptyCard title="No position yet" module="farm" />;
  }
  let card: ReactNode = null;
  if (pos && val > 0) {
    const earned = pos.earned * px(pos.sym), rc = receipt(v, k, pos.amt + pos.earned, val, basis?.sp);
    const s0 = posSeries(pos.since, pos.amt, pos.earned, px(pos.sym), basis?.sp);
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
  if (k === "kam") return <KamAnalytics v={v} />;
  if (k === "blend") return <BlendAnalytics v={v} />;
  if (k === "per") return <PerAnalytics v={v} />;
  if (k === "lp") return <LpAnalytics v={v} />;
  return <DnAnalytics v={v} />;
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

function BlendAnalytics({ v }: { v: Vault }) {
  const { colors } = useTheme();
  const x = BLEND_X[v.id], [r, setR] = useState(90), [tip, setTip] = useState(false);
  const bor = v.borrowUsd ?? x.borU, dep = v.supplyUsd ?? x.depU;
  const pts = useMemo(() => blendSeries(v.id, x.sup, x.rate), [v.id, x]);
  const s = N - r, d = pts.slice(s);
  return (
    <>
      <Tiles items={[["Borrowed", usdC(bor)], ["Liquidity", usdC(dep - bor)]]} />
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>1 {x.rc} = {nf(x.rate, 4)} {x.label}</Text>
          <InfoBtn on={tip} onPress={() => setTip(!tip)} />
        </View>
        {tip && <Text style={[styles.tip, { color: colors.muted }]}>What one receipt is worth. It rises as interest accrues.</Text>}
        <View style={styles.ctl}><View /><Ranges value={r} onChange={setR} /></View>
        <FarmChart data={d} dates={allDates.slice(s)} axis={(t, st) => nf(t, st < 0.01 ? 4 : 3)} read={(i) => `${dLbl(dayMs(s + i))}: ${nf(d[i], 4)} ${x.label}`} />
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

const cmp = (n: number) => {
  const a = Math.abs(n);
  return a >= 1e9 ? nf(n / 1e9, 2) + "B" : a >= 1e6 ? nf(n / 1e6, 2) + "M" : a >= 1e3 ? nf(n / 1e3, 2) + "K" : nf(n, 2);
};
function LpAnalytics({ v }: { v: Vault }) {
  const p = LP_X[v.id], b = v.id === "soroswap-xlm" ? "SoUSDC" : "AqUSDC";
  return <Tiles items={[["XLM", cmp(p.ra), "", usd(p.ra * px("XLM"))], ["USDC", cmp(p.rb), "", usd(p.rb * px(b))], ["LP shares", nf(p.shares, 2), "", `${usd(lpSharePx(v.id))} each`], ["Contract", p.addr]]} />;
}

function DnAnalytics({ v }: { v: Vault }) {
  const { colors } = useTheme();
  const { chain } = useChain();
  const B: Basis = BASIS_X[v.id];
  const m = useMemo(() => buildBasis(B), [B]);
  const [perf, setPerf] = useState<"share" | "funding" | "vs">("share");
  const [perfR, setPerfR] = useState(90), [apyR, setApyR] = useState(30), [basisK, setBasisK] = useState<"roi" | "apy">("roi");
  const [real, setReal] = useState<{ dates: number[]; vals: number[] } | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchFundingDays(B.asset).then((r) => live && r.vals.length >= 14 && setReal(r)).catch(() => {});
    return () => void (live = false);
  }, [B.asset]);
  const borA = POOLS_BY[chain].find((p) => p.sym === "USDC")?.borA ?? 5.96;
  const nn = perf === "vs" ? apyR : perfR, s = N - nn;
  let ch: ReactNode;
  if (perf === "share") {
    const d = m.sp.slice(s);
    ch = <FarmChart data={d} dates={allDates.slice(s)} axis={(t, st) => nf(t, Math.max(2, -Math.floor(Math.log10(st))))} read={(i) => `${dLbl(dayMs(s + i))}: ${nf(d[i], 4)} USDC per ${B.share}`} />;
  } else if (perf === "funding") {
    // Real Phoenix funding when it loaded (UTC-day average, annualised), else the design's sample series.
    const rd = real && real.vals.slice(-Math.min(nn, real.vals.length)), rdates = real && real.dates.slice(-Math.min(nn, real.dates.length));
    const d = rd ?? m.f.slice(s), dates = rdates ?? allDates.slice(s);
    ch = <FarmChart data={d} bars dates={dates} axis={axPct} read={(i) => `${dLbl(dates[i])}: funding ${spct(d[i], 1)}${rd ? "" : `, vault that day ${pct(m.apy[s + i], 1)}`}`} />;
  } else {
    const d = m.apy.slice(s);
    ch = <FarmChart data={d} ref={borA} zero dates={allDates.slice(s)} axis={axPct} read={(i) => `${dLbl(dayMs(s + i))}: vault ${pct(d[i], 1)}, borrow ${pct(borA, 1)}, spread ${spct(d[i] - borA, 1)}`} />;
  }
  const f30 = real ? real.vals.slice(-30) : null;
  const funding30 = f30 ? avg(f30) : m.funding30, negDays = f30 ? f30.filter((z) => z < 0).length : m.negDays30;
  const parts: [string, number][] = [["Funding", m.funding7 * HEDGE], ["Phoenix fees", -(B.perpFee * HEDGE + B.exec)], ["Vault fee", 0]];
  const mx = Math.max(...parts.map((q) => Math.abs(q[1]))) || 1;
  const leg = B.tvl * HEDGE, spot = leg * (1 + B.delta / 100), maxLeg = Math.max(leg, spot), ap = px(B.asset), dq = ap > 1e4 ? 4 : 2;
  const spread = m.apy7 - borA;
  const lvl = (ok: boolean, w?: boolean): "low" | "med" | "high" => (ok ? "low" : w ? "med" : "high");
  const risks: [IconName, string, "low" | "med" | "high", string][] = [
    ["trending_down", "Negative funding", lvl(negDays <= 3, negDays <= 6), `${negDays} of 30 days`],
    ["balance", "Below borrow APY", lvl(spread >= 3, spread >= 0), spct(spread, 1)],
    ["trending_up", "Short squeeze", "low", `+${B.sq}%`],
    ["lan", "Venue risk", "med", "2 venues"],
  ];
  const mon = monthly(m.sp, basisK);
  return (
    <>
      <Tiles items={[["Net APY 30D", pct(m.apy30, 1)], ["Net APY 90D", pct(m.apy90, 1)], ["Since launch", pct(m.apyAll, 1)], ["Avg funding 30D", spct(funding30, 1)], ["Sharpe ratio", nf(m.sharpe, 2)], ["Max drawdown", pct(m.mdd, 2)]]} />
      <Card>
        <Seg opts={[["share", "Share price"], ["funding", "Funding"], ["vs", "Vs borrow"]]} value={perf} onChange={setPerf} />
        <View style={styles.ctl}><View /><Ranges value={nn} onChange={perf === "vs" ? setApyR : setPerfR} /></View>
        {ch}
        {perf === "vs" && (
          <View style={{ flexDirection: "row", gap: 14 }}>
            <Legend label="Vault APY" />
            <Legend label="USDC borrow APY" dashed />
          </View>
        )}
        {perf === "funding" && <Text style={[styles.stl, { color: colors.muted }]}>{real ? "Phoenix funding, daily average annualised" : "Sample series (Phoenix funding unavailable)"}</Text>}
      </Card>
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Yield sources</Text>
          <InfoBtn on={tip === "y"} onPress={() => setTip(tip === "y" ? null : "y")} />
        </View>
        {tip === "y" && <Text style={[styles.tip, { color: colors.muted }]}>Last 7 days, annualised. Funding is what shorts earn; Phoenix fees and rebalancing cost; no vault, deposit or exit fee.</Text>}
        <View style={{ gap: 12 }}>
          {parts.map(([l, q]) => (
            <View key={l} style={styles.wfr}>
              <Text style={[styles.body14, { color: colors.text, flex: 1 }]}>{l}</Text>
              <View style={[styles.trk, { backgroundColor: colors.segment }]}>
                <View style={{ height: 6, width: `${(Math.abs(q) / mx) * 100}%`, borderRadius: 3, backgroundColor: q > 0 ? colors.positive : q < 0 ? colors.negative : colors.borderControl }} />
              </View>
              <Text style={[styles.b14, { width: 56, textAlign: "right", color: q >= 0 ? colors.positive : colors.negative }]}>{spct(q, 1)}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Both legs</Text>
          <Tag label="Neutral" tone="teal" />
        </View>
        {([["Long", `${B.asset} spot`, spot, "l"], ["Short", `${B.perp} 1x`, leg, "s"]] as const).map(([side, name, amt, c]) => (
          <View key={side} style={[styles.leg, { backgroundColor: colors.bg }]}>
            <View style={[styles.side, { backgroundColor: c === "l" ? colors.tealTint : colors.pinkTint }]}>
              <Text style={[styles.sideT, { color: c === "l" ? colors.onTealTint : colors.onPinkTint }]}>{side}</Text>
            </View>
            <Text style={[styles.b14, { color: colors.text, flex: 1 }]} numberOfLines={1}>{name}</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.b14, { color: colors.text }]}>{nf(amt / ap, dq)} {B.asset}</Text>
              <Text style={[styles.stl, { color: colors.muted }]}>{usd(amt)}</Text>
            </View>
          </View>
        ))}
        <View style={{ flexDirection: "row", height: 8, marginVertical: 4 }}>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <View style={{ width: `${(spot / maxLeg) * 100}%`, height: 8, borderTopLeftRadius: 4, borderBottomLeftRadius: 4, backgroundColor: colors.positive }} />
          </View>
          <View style={{ width: 2, marginHorizontal: -1, top: -4, height: 16, borderRadius: 1, backgroundColor: colors.text }} />
          <View style={{ flex: 1 }}>
            <View style={{ width: `${(leg / maxLeg) * 100}%`, height: 8, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: colors.negative }} />
          </View>
        </View>
      </Card>
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Risks</Text>
          <InfoBtn on={tip === "r"} onPress={() => setTip(tip === "r" ? null : "r")} />
        </View>
        {tip === "r" && <Text style={[styles.tip, { color: colors.muted }]}>{`Negative funding: days shorts paid in the last 30. Below borrow APY: vault APY over the USDC borrow APY. Short squeeze: ${B.asset} rise that liquidates the short. Venue risk: Phoenix, Jupiter and oracles.`}</Text>}
        <View style={styles.rk}>
          {risks.map(([ic, t, l, x]) => (
            <Risk key={t} icon={ic} title={t} level={l} value={x} />
          ))}
        </View>
      </Card>
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Monthly</Text>
          <Seg opts={[["roi", "ROI"], ["apy", "APY"]]} value={basisK} onChange={setBasisK} />
        </View>
        {mon.map((r) => (
          <View key={r.l} style={[styles.txr, { borderTopColor: colors.divider, minHeight: 40 }]}>
            <Text style={[styles.body14, { color: colors.text, flex: 1 }]}>{r.l}{r.mtd ? <Text style={[styles.stl, { color: colors.muted }]}> MTD</Text> : null}</Text>
            <Text style={[styles.b14, { color: r.v >= 0 ? colors.positive : colors.negative }]}>{spct(r.v, 1)}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function Risk({ icon, title, level, value }: { icon: IconName; title: string; level: "low" | "med" | "high"; value: string }) {
  const { colors, isDark } = useTheme();
  const col = level === "low" ? colors.positive : level === "high" ? colors.negative : isDark ? "#FF8AC2" : "#B50057";
  const n = level === "low" ? 1 : level === "med" ? 2 : 3;
  return (
    <View style={[styles.rt, { backgroundColor: colors.bg }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={16} color={colors.text} />
        <Text style={[styles.stl, { color: colors.text, fontFamily: font.semibold, flex: 1 }]} numberOfLines={1}>{title}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: i < n ? col : colors.border }} />
        ))}
        <Text style={{ marginLeft: 4, fontFamily: font.semibold, fontSize: 11, color: col }}>{{ low: "Low", med: "Medium", high: "High" }[level]}</Text>
      </View>
      <Text style={[styles.b16, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

/* ---------- How it works ---------- */
const HOW: Record<Kind, (v: Vault) => [string, string?][]> = {
  kam: (v) => [["Supply from your margin account", `${v.sym} already in your margin account goes to Kamino`], ["Earn Kamino supply yield", "The receipt stays in your margin account and counts toward its health factor"], ["Withdraw anytime", "Back into your margin account"]],
  blend: (v) => [["Supply from your margin account", `${v.sym} already in your margin account goes to Blend`], ["Earn Blend supply yield", `The ${BLEND_X[v.id]?.rc} receipt counts toward your health factor`], ["Withdraw anytime", "Back into your margin account"]],
  dn: (v) => [["Deposit from your margin account", "USDC, USDT or SOL, in one approval"], ["The vault hedges", `${BASIS_X[v.id].asset} held at Phoenix, an equal 1x ${BASIS_X[v.id].perp} short`], ["Earn the funding", "Shares count toward your health factor"]],
  per: (v) => [["Deposit USDC from your margin account", `Perena issues ${PER_X[perKey(v.id)].rc} at its share price`], ["Earn the share price", "The receipt counts toward your health factor"], ["Withdraw anytime", "No lockup, back to USDC"]],
  lp: (v) => [["Add both tokens from your margin account", "XLM and USDC at the pool price"], ["Earn trading fees", `Every swap pays ${pct(LP_X[v.id].fee)}; the XLM price moves your share`], ["Remove anytime", "Back into your margin account"]],
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
  b16: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, fontVariant: ["tabular-nums"] },
  body14: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  txr: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48.5%", flexGrow: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  shadow: { shadowColor: "#111111", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  chh: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 32 },
  tip: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  rng: { minWidth: 44, height: 32, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", padding: 2, borderRadius: 12, gap: 2, alignSelf: "flex-start", maxWidth: "100%" },
  segB: { minHeight: 36, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  wfr: { flexDirection: "row", alignItems: "center", gap: 10 },
  trk: { width: 64, height: 6, borderRadius: 3, overflow: "hidden" },
  leg: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  side: { minWidth: 48, alignItems: "center", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  sideT: { fontFamily: font.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 0.3, textTransform: "uppercase" },
  rk: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rt: { width: "48.5%", flexGrow: 1, gap: 6, padding: 12, borderRadius: 12 },
  how: { borderRadius: 16, paddingHorizontal: 16 },
  howH: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
