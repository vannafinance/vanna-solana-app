import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/kit";
import {
  avgSupply30, dailySamples, fetchKaminoHistory, fetchPerenaHistory, historicalApy, kaminoCached, kaminoSaved, type KamSym, type NavPoint,
  navStats, type PerId, perenaCached, type RateDay,
} from "@/chain/solana/farm-history";
import { nf, pct, spct } from "@/format";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

import { usdC, type Vault } from "./farm";
import { FarmChart, fullDay, type Range, RangePills, rangeSlice, rangesFor } from "./vault-chart";
import { PER_X } from "./vault-model";

/* Farm vault > Analytics (design analytics(P), screens/farm.js). Kamino: Borrowed, Liquidity and APY 30D tiles, then the APY card
   (supply line, dashed borrow line) from Kamino's daily reserve history. Perena: the Share price card and APY 30D / ROI / Max
   drawdown from the web server's recorded share prices; until that source answers, today's figures only and no chart. */
const opt = (n: number | null | undefined, f: (n: number) => string) => (n === undefined || n === null || !isFinite(n) ? "—" : f(n));
const perKey = (id: string): PerId => (id === "junior" ? "junior" : "usdstar");
const axPct = (t: number, st: number) => pct(t, st < 1 ? 1 : 0);
const pickRange = (opts: Range[], want: Range) => (opts.includes(want) ? want : opts.length ? (opts.includes(90) ? 90 : opts[opts.length - 1]) : want);

export function Analytics({ v }: { v: Vault }) {
  return v.venue === "Perena" ? <PerAnalytics v={v} /> : <KamAnalytics v={v} />;
}

export function Tiles({ items }: { items: [string, string, string?, string?][] }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.tiles}>
      {items.map(([l, x, c, s]) => (
        <View key={l} style={[styles.tile, { backgroundColor: colors.surface }, !isDark && styles.shadow]}>
          <Text style={[styles.stl, { color: colors.muted }]} numberOfLines={1}>{l}</Text>
          <Text style={[styles.stv, { color: c === "pos" ? colors.positive : c === "neg" ? colors.negative : colors.text }]} numberOfLines={1}>{x}</Text>
          {s ? <Text style={[styles.stl, { color: colors.muted }]} numberOfLines={1}>{s}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/* ---------- Kamino ---------- */
type Load<T> = { rows: T | null; failed: boolean };
function useKaminoHistory(sym: KamSym) {
  const [s, setS] = useState<Load<RateDay[]>>(() => ({ rows: kaminoCached(sym, "recent"), failed: false }));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const ctl = new AbortController();
    let have = !!kaminoCached(sym, "recent");
    if (!have)
      kaminoSaved(sym).then((rows) => {
        if (rows && !ctl.signal.aborted && !have) {
          have = true;
          setS({ rows, failed: false });
        }
      });
    fetchKaminoHistory(sym, "recent", ctl.signal).then(
      (rows) => {
        if (ctl.signal.aborted) return;
        have = true;
        setS({ rows, failed: false });
      },
      () => {
        // A saved copy (under a day old) stays on screen when the refresh fails.
        if (!ctl.signal.aborted) setS((p) => (p.rows ? p : { rows: null, failed: true }));
      },
    );
    return () => ctl.abort();
  }, [sym, tick]);
  const retry = () => {
    setS({ rows: null, failed: false });
    setTick((t) => t + 1);
  };
  return { ...s, retry };
}
function useKaminoAll(sym: KamSym, on: boolean) {
  const [s, setS] = useState<Load<RateDay[]>>(() => ({ rows: kaminoCached(sym, "all"), failed: false }));
  useEffect(() => {
    if (!on) return;
    const ctl = new AbortController();
    fetchKaminoHistory(sym, "all", ctl.signal).then(
      (rows) => {
        if (!ctl.signal.aborted) setS({ rows, failed: false });
      },
      () => {
        if (!ctl.signal.aborted) setS({ rows: null, failed: true });
      },
    );
    return () => ctl.abort();
  }, [sym, on]);
  return s;
}

function KamAnalytics({ v }: { v: Vault }) {
  const { colors } = useTheme();
  const sym = v.sym as KamSym;
  const h = useKaminoHistory(sym);
  const opts = useMemo(() => (h.rows ? rangesFor(h.rows) : []), [h.rows]);
  const [want, setWant] = useState<Range>(90);
  const range = pickRange(opts, want);
  const all = useKaminoAll(sym, range === 0);
  const loadingAll = range === 0 && !all.rows && !all.failed;
  const rows = useMemo(() => {
    if (!h.rows) return [];
    if (range === 0) return all.rows ?? rangeSlice(h.rows, 90);
    return rangeSlice(h.rows, range);
  }, [h.rows, range, all.rows]);
  const series = useMemo(() => ({ sup: rows.map((r) => r.sup), bor: rows.map((r) => r.bor), at: rows.map((r) => r.at) }), [rows]);
  const liq = v.supplyUsd !== undefined && v.borrowUsd !== undefined ? v.supplyUsd - v.borrowUsd : undefined;
  const avg30 = h.rows ? avgSupply30(h.rows) : null;
  const last = rows[rows.length - 1];
  const note = all.failed && range === 0 ? "Older history is unavailable right now" : null;
  return (
    <>
      <Tiles items={[["Borrowed", opt(v.borrowUsd, usdC)], ["Liquidity", opt(liq, usdC)], ["APY 30D", opt(avg30, (n) => pct(n)), avg30 === null ? "" : "pos"]]} />
      <Card>
        <View style={styles.chh}>
          <Text style={[styles.title, { color: colors.text, flex: 1 }]}>APY</Text>
        </View>
        <RangePills options={opts} value={range} onChange={setWant} />
        {rows.length >= 2 ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10 }}>
            <FarmChart
              data={series.sup}
              cmp={series.bor}
              dates={series.at}
              axis={axPct}
              read={(i) => (loadingAll ? "Loading all history…" : note ?? `${fullDay(rows[i].at)}: supply ${pct(rows[i].sup)}, borrow ${pct(rows[i].bor)}`)}
              label={`${v.sym} supply and borrow APY from ${fullDay(rows[0].at)} to ${fullDay(last.at)}. Latest supply ${pct(last.sup)}, borrow ${pct(last.bor)}.`}
            />
            <View style={styles.legend}>
              <Leg dashed={false} label="Supply APY" />
              <Leg dashed label="Borrow APY" />
            </View>
          </Animated.View>
        ) : (
          <ChartState failed={h.failed} empty={!!h.rows} onRetry={h.retry} />
        )}
      </Card>
    </>
  );
}

function Leg({ dashed, label }: { dashed: boolean; label: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 14, height: 0, borderTopWidth: 2, borderStyle: dashed ? "dashed" : "solid", borderColor: dashed ? colors.muted : isDark ? "#FF5CAB" : "#E2087A" }} />
      <Text style={[styles.stl, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

// Loading, failed and empty states keep the chart's height so the page does not jump.
function ChartState({ failed, empty, onRetry }: { failed: boolean; empty: boolean; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.state, { backgroundColor: colors.divider }]}>
      <Text style={[styles.stl, { color: colors.muted, textAlign: "center" }]}>
        {failed ? "History is unavailable right now" : empty ? "No history yet" : "Loading history…"}
      </Text>
      {failed && (
        <Pressable onPress={onRetry} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.b13, { color: colors.text }]}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Perena ---------- */
function usePerenaHistory(id: PerId) {
  const [points, setPoints] = useState<NavPoint[] | null | undefined>(() => perenaCached(id));
  useEffect(() => {
    const ctl = new AbortController();
    fetchPerenaHistory(id, ctl.signal).then(
      (p) => {
        if (!ctl.signal.aborted) setPoints(p);
      },
      () => {},
    );
    return () => ctl.abort();
  }, [id]);
  return points ?? null;
}

function PerAnalytics({ v }: { v: Vault }) {
  const { colors } = useTheme();
  const k = perKey(v.id), p = PER_X[k], [tip, setTip] = useState(false);
  const points = usePerenaHistory(k);
  const days = useMemo(() => (points ? dailySamples(points) : []), [points]);
  const opts = useMemo(() => rangesFor(days), [days]);
  const [want, setWant] = useState<Range>(90);
  const range = pickRange(opts, want);
  const shown = useMemo(() => rangeSlice(days, range), [days, range]);
  const series = useMemo(() => ({ val: shown.map((d) => d.value), at: shown.map((d) => d.at) }), [shown]);
  const stats = useMemo(() => {
    if (!points || points.length < 2) return null;
    const st = navStats(points);
    return { apy30: historicalApy(points, points[points.length - 1], 30), roi: st.roi, mdd: st.maxDrawdown };
  }, [points]);
  const hasChart = shown.length >= 2;
  const info = (t: string) => (
    <View style={styles.chh}>
      <Text style={[styles.title, { color: colors.text, flex: 1 }]}>{t}</Text>
      <Pressable onPress={() => setTip(!tip)} hitSlop={10} accessibilityRole="button" accessibilityLabel="About this" accessibilityState={{ expanded: tip }}>
        <Icon name="info" size={18} color="muted" />
      </Pressable>
    </View>
  );
  // No recorded history (the source is closed to the app today, or has fewer than two days): today's figures only.
  if (!hasChart || !stats)
    return (
      <>
        <Card>
          {info(p.rc)}
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
  const last = shown[shown.length - 1];
  return (
    <>
      <Card>
        {info("Share price")}
        {tip && <Text style={[styles.tip, { color: colors.muted }]}>{`${p.who}. No lockup. USD per ${p.rc}, daily, from the share prices Vanna records.`}</Text>}
        <RangePills options={opts} value={range} onChange={setWant} />
        <Animated.View entering={FadeIn.duration(200)}>
          <FarmChart
            data={series.val}
            dates={series.at}
            axis={(t, st) => "$" + nf(t, Math.max(4, -Math.floor(Math.log10(st))))}
            read={(i) => `${fullDay(shown[i].at)}: $${nf(shown[i].value, 6)} per ${p.rc}`}
            label={`${p.rc} share price from ${fullDay(shown[0].at)} to ${fullDay(last.at)}. Latest $${nf(last.value, 6)}.`}
          />
        </Animated.View>
      </Card>
      <Tiles
        items={[
          ["APY 30D", opt(stats.apy30, (n) => pct(n))],
          ["ROI", opt(stats.roi, (n) => spct(n, 3))],
          ["Max drawdown", opt(stats.mdd, (n) => pct(Math.abs(n), 3))],
          ["Perena price", opt(v.perenaPrice, (n) => "$" + nf(n, 6))],
          ["Exit fee", p.exitFee],
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "48.5%", flexGrow: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  shadow: { shadowColor: "#111111", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  stl: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  stv: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24, fontVariant: ["tabular-nums"] },
  b13: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18 },
  chh: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 32 },
  title: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20 },
  tip: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  state: { height: 212, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
});
