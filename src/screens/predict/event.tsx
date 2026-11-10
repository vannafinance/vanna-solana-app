import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Line, Path, Stop } from "react-native-svg";

import { SubTabs } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs } from "@/components/ui/kit";
import { nf, sUsd, spct, usd } from "@/format";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { AfterTransition } from "@/ui/ready";

import { BetList, betRows, SrcBadge } from "./bets";
import {
  ask, bid, byChance, cf, cpair, dAgo, endsShort, type Ev, EVM, hist, lab, levels, livePx, mainOuts, mName, openOuts, OUT, type Out, p2, pairingHist, pairsOf, P, pc, pmx, pp,
  RATE, seriesOf, shf, side as poolSide, team, usdC, whenOf, yl, nl, type Side,
} from "./model";
import { runClaim, openTrade } from "./trade";
import { Chip, EvIcon, Meter, QBtn, SideTag, TeamLogo, TipBox, TipBtn, Tips, useTip } from "./ui";

/* Market screen (design SCREENS['predict-market']): head + chart, outcomes, your position, Earning | Order book | Rules | Activity,
   and the pinned Buy Yes / Buy No footer that opens the trade sheet (trade.tsx). */
type Tab = "earning" | "book" | "rules" | "activity";

export function EventScreen({ id, m, side, act }: { id: string; m?: string; side?: string; act?: string }) {
  useDataVersion();
  const { colors } = useTheme();
  const e = EVM(id);
  const first = e ? (e.type === "multi" ? mainOuts(e).slice().sort(byChance)[0] : mainOuts(e)[0]) : undefined;
  const start = e && OUT(e, m) && !OUT(e, m)!.res ? OUT(e, m)! : first;
  const [sel, setSel] = useState(start?.k ?? "");
  const [bside, setBside] = useState<Side>(side === "no" ? "no" : "yes");
  const [tab, setTab] = useState<Tab>("earning");
  const [showRes, setShowRes] = useState(false);

  // deep links: Sell on a position / Buy more open the trade sheet once the screen has settled
  useEffect(() => {
    if (!e || !start || act !== "sell") return;
    const t = setTimeout(() => openTrade(e, start, side === "no" ? "no" : "yes", "sell", true), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!e) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="Market" />
        <View style={{ padding: 16 }}><EmptyCard title="Market not found" action="See markets" onAction={() => router.back()} module="predict" /></View>
      </View>
    );
  }
  const o = OUT(e, sel) ?? start!;
  const won = P.pos.some((p) => p.ev === e.id && pmx(p).won);
  const outs = e.outs.length > 1 ? <OutsCard e={e} sel={o.k} onSel={setSel} onBuy={(x, sd) => { setSel(x.k); setBside(sd); openTrade(e, x, sd, "buy", true); }} showRes={showRes} setShowRes={setShowRes} /> : null;
  const pos = <PosCard e={e} onBuy={(x, sd, mode) => openTrade(e, x, sd, mode, true)} />;
  const multi = mainOuts(e).length > 1;
  const [py, pn] = cpair(ask(o, "yes"), ask(o, "no"));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title={e.tag} />
      <AfterTransition>
        <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
          <HeadCard e={e} o={o} />
          {won ? pos : outs}
          {won ? outs : pos}
          <Card style={{ paddingHorizontal: 0, paddingBottom: 0, gap: 0 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <SubTabs items={[["earning", "Earning"], ["book", "Order book"], ["rules", "Rules"], ["activity", "Activity"]]} value={tab} onChange={setTab} fam={families.predict} />
            </View>
            <View style={{ padding: 16 }}>
              {tab === "earning" ? <EarnTab e={e} o={o} onPick={setSel} /> : tab === "book" ? <BookTab e={e} o={o} sd={bside} setSd={setBside} /> : tab === "rules" ? <RulesTab e={e} /> : <ActTab e={e} />}
            </View>
          </Card>
        </ScrollView>
      </AfterTransition>
      <View style={[s.foot, { backgroundColor: colors.bg, borderTopColor: colors.divider }]}>
        {multi && (
          <View style={[s.row, { justifyContent: "center", gap: 6 }]}>
            {team(o) && <TeamLogo o={o} size={20} />}
            <Text style={[s.capB, { color: colors.text }]} numberOfLines={1}>{o.name}</Text>
          </View>
        )}
        <View style={s.row}>
          <Button label={`Buy ${yl(o)} ${py}`} fam={families.predict} style={{ flex: 1 }} onPress={() => openTrade(e, o, "yes", "buy", true)} />
          <Button label={`Buy ${nl(o)} ${pn}`} v="danger" style={{ flex: 1 }} onPress={() => openTrade(e, o, "no", "buy", true)} />
        </View>
      </View>
    </View>
  );
}

/* ---------- head + chart ---------- */
function HeadCard({ e, o }: { e: Ev; o: Out }) {
  const { colors } = useTheme();
  const meta: string[] = [];
  const tiles = tilesFor(e, o);
  if (e.type === "match") meta.push(e.live ? `${e.score}, ${e.when}` : (e.when ?? ""));
  if (!tiles) {
    meta.push(`${usdC(e.vol)} Vol`);
    if (e.type !== "match") meta.push(`Ends ${endsShort(e.ends)}`);
  } else if (e.type !== "binary" && e.type !== "strike" && e.type !== "updown") meta.push(whenOf(e));
  return (
    <Card>
      <View style={s.row}>
        <EvIcon e={e} size={48} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={[s.row, { flexWrap: "wrap", gap: 6 }]}>
            <Chip label={e.tag} tone="blue" />
            {e.live && <Chip label="Live" tone="pink" />}
            {meta.filter(Boolean).map((x) => <Text key={x} style={[s.cap, { color: colors.muted }]}>{x}</Text>)}
          </View>
        </View>
      </View>
      <Text style={[s.h1, { color: colors.text }]} accessibilityRole="header">{e.title}</Text>
      {tiles}
      <Chart e={e} />
    </Card>
  );
}
function tilesFor(e: Ev, o: Out) {
  if (e.type === "binary") return <Pairs items={[{ label: "Chance", value: pc(o.y) }, { label: "Volume", value: usdC(e.vol) }, { label: "Ends", value: endsShort(e.ends) }]} />;
  if (e.type === "updown") {
    const now = livePx(e.asset!), chg = (now / (e.open ?? now) - 1) * 100;
    return <Pairs n={2} items={[{ label: "Up chance", value: pc(o.y) }, { label: e.asset!, value: "$" + nf(now, now < 100 ? 2 : 0), sub: `${spct(chg)} from $${nf(e.open ?? 0, 2)}`, tone: now >= (e.open ?? 0) ? "pos" : "neg" }, { label: "Closes in", value: e.countdown ?? "" }, { label: "Volume", value: usdC(e.vol) }]} />;
  }
  if (e.type === "strike") return <Pairs items={[{ label: e.asset!, value: "$" + nf(livePx(e.asset!), 0) }, { label: "Ends in", value: e.countdown ?? "", sub: endsShort(e.ends) }, { label: "Volume", value: usdC(e.vol) }]} />;
  return null;
}

function Chart({ e }: { e: Ev }) {
  const { colors, isDark } = useTheme();
  const [range, setRange] = useState<"1W" | "1M" | "All">("1M");
  const [w, setW] = useState(0);
  const acc = isDark ? "#5BE8F1" : "#1C7C83", SER = [acc, "#E8A33D", "#8D61EB", colors.borderControl];
  const H = 150, PT = 12, PB = 24, GR = 40, ch = H - PT - PB;
  const n = range === "1W" ? 8 : range === "1M" ? 31 : 120;
  const ser = seriesOf(e).map(([o, i]) => ({ o, c: SER[i] ?? SER[3], pts: hist(o).slice(-n) }));
  const all = ser.flatMap((x) => x.pts), lo = Math.max(0, Math.floor((Math.min(...all) - 5) / 25) * 25), hi = Math.min(100, Math.ceil((Math.max(...all) + 5) / 25) * 25);
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += 25) ticks.push(t);
  const fy = (v: number) => 1 - (v - lo) / (hi - lo || 1), pw = Math.max(0, w - GR), one = ser.length === 1;
  const path = (x: (typeof ser)[number]) => x.pts.map((v, i) => `${i ? "L" : "M"}${((i / (n - 1)) * pw).toFixed(1)} ${(PT + fy(v) * ch).toFixed(2)}`).join(" ");
  return (
    <View style={{ gap: 8 }}>
      <View style={[s.row, { flexWrap: "wrap", gap: 12 }]}>
        {ser.map((x) => (
          <View key={x.o.k} style={[s.row, { gap: 6 }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: x.c }} />
            <Text style={[s.cap, { color: colors.muted }]}>{x.o.k === "m" ? lab(x.o, "yes") : x.o.name}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: H }} onLayout={(ev) => setW(ev.nativeEvent.layout.width)} accessibilityRole="image" accessibilityLabel={`Chance over time, ${ser.map((x) => `${x.o.k === "m" ? lab(x.o, "yes") : x.o.name} ${pc(x.o.y)}`).join(", ")}`}>
        {w > 0 && (
          <Svg width={w} height={H}>
            {one && (
              <Defs>
                <LinearGradient id="pdg" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={acc} stopOpacity={0.24} />
                  <Stop offset="1" stopColor={acc} stopOpacity={0} />
                </LinearGradient>
              </Defs>
            )}
            {ticks.map((t) => <Line key={t} x1={0} x2={pw} y1={PT + fy(t) * ch} y2={PT + fy(t) * ch} stroke={colors.border} strokeWidth={1} />)}
            {one && <Path d={`${path(ser[0])} L${pw} ${PT + ch} L0 ${PT + ch} Z`} fill="url(#pdg)" />}
            {ser.slice().reverse().map((x) => <Path key={x.o.k} d={path(x)} fill="none" stroke={x.c} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />)}
          </Svg>
        )}
        {ticks.map((t) => <Text key={t} style={[s.axis, { top: PT + fy(t) * ch - 8, color: colors.muted }]}>{t}%</Text>)}
        <Text style={[s.xl, { left: 0, color: colors.muted }]}>{dAgo(n - 1)}</Text>
        <Text style={[s.xl, { left: Math.max(0, pw / 2 - 20), color: colors.muted }]}>{dAgo(Math.round((n - 1) / 2))}</Text>
        <Text style={[s.xl, { left: Math.max(0, pw - 34), color: colors.muted }]}>{dAgo(0)}</Text>
      </View>
      <View style={s.row}>
        {(["1W", "1M", "All"] as const).map((k) => (
          <Pressable key={k} onPress={() => setRange(k)} accessibilityRole="tab" accessibilityState={{ selected: range === k }} style={[s.rc, { backgroundColor: range === k ? colors.chipActive : colors.segment }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: range === k ? colors.onChipActive : colors.text }}>{k}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ---------- outcomes ---------- */
function OutsCard({ e, sel, onSel, onBuy, showRes, setShowRes }: { e: Ev; sel: string; onSel: (k: string) => void; onBuy: (o: Out, s: Side) => void; showRes: boolean; setShowRes: (v: boolean) => void }) {
  const { colors } = useTheme();
  const main = e.outs.filter((o) => !o.grp && !o.res), more = e.outs.filter((o) => o.grp), res = e.outs.filter((o) => o.res);
  const rows = e.type === "multi" ? main.slice().sort(byChance) : main;
  const title = ({ match: "Who wins", multi: "Outcomes", date: "Dates", strike: "Price targets" } as Record<string, string>)[e.type] ?? "Markets";
  const row = (o: Out) => <OutRow key={o.k} e={e} o={o} on={!o.res && o.k === sel} onSel={onSel} onBuy={onBuy} />;
  return (
    <Card style={{ gap: 4 }}>
      <Text style={[s.sec, { color: colors.text }]}>{title}</Text>
      {rows.map(row)}
      {more.length > 0 && <Text style={[s.sec, { color: colors.text, marginTop: 8 }]}>Side bets</Text>}
      {more.map(row)}
      {res.length > 0 && (
        <>
          <Pressable onPress={() => setShowRes(!showRes)} accessibilityRole="button" accessibilityState={{ expanded: showRes }} style={[s.row, { minHeight: 44 }]}>
            <Text style={[s.b, { color: colors.text, flex: 1 }]}>Resolved ({res.length})</Text>
            <Icon name={showRes ? "expand_less" : "expand_more"} size={20} color="muted" />
          </Pressable>
          {showRes && res.map(row)}
        </>
      )}
    </Card>
  );
}

function OutRow({ e, o, on, onSel, onBuy }: { e: Ev; o: Out; on: boolean; onSel: (k: string) => void; onBuy: (o: Out, s: Side) => void }) {
  const { colors } = useTheme();
  const held = P.pos.filter((p) => p.ev === e.id && p.o === o.k);
  const sub = o.res ? `Resolved ${o.res === "yes" ? yl(o) : nl(o)}` : held.length ? held.map((p) => shf(p.sh + p.yld) + " " + lab(o, p.side)).join(" and ") + " held" : "";
  const [py, pn] = cpair(o.y, o.n), d = o.d || 0;
  return (
    <View style={[s.or, { backgroundColor: on ? colors.blueTint : "transparent", opacity: o.res ? 0.75 : 1 }]}>
      <Pressable onPress={() => !o.res && onSel(o.k)} disabled={!!o.res} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${o.name}, ${o.res ? "resolved" : pc(o.y)}`} style={[s.row, { flex: 1, minWidth: 0 }]}>
        {team(o) && <TeamLogo o={o} size={32} />}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[s.b, { color: colors.text }]}>{o.name}</Text>
          {!!sub && <Text style={[s.cap, { color: held.length ? colors.link : colors.muted }]}>{sub}</Text>}
        </View>
        <View style={{ width: 48, alignItems: "flex-end" }}>
          <Text style={[s.lg, { color: colors.text }]}>{o.res ? (o.res === "yes" ? "100%" : "0%") : pc(o.y)}</Text>
          {!o.res && !!d && <Text style={[s.small, { color: d > 0 ? colors.positive : colors.negative }]}>{d > 0 ? "↑" : "↓"}{Math.abs(d)}</Text>}
        </View>
      </Pressable>
      {!o.res && (
        <View style={s.row}>
          <QBtn e={e} o={o} side="yes" label={`${yl(o)} ${py}`} onPress={() => onBuy(o, "yes")} />
          <QBtn e={e} o={o} side="no" label={`${nl(o)} ${pn}`} onPress={() => onBuy(o, "no")} />
        </View>
      )}
    </View>
  );
}

/* ---------- your position(s) ---------- */
function PosCard({ e, onBuy }: { e: Ev; onBuy: (o: Out, s: Side, mode: "buy" | "sell") => void }) {
  const { colors } = useTheme();
  const mine = P.pos.filter((p) => p.ev === e.id).map((p) => [p, pmx(p)] as const).sort((a, b) => Number(b[1].res) - Number(a[1].res));
  const linked = betRows((r) => r.kind === "hold" && r.go?.ev === e.id);
  if (!mine.length && !linked.length) return null;
  const n = mine.length + linked.length;
  return (
    <Card style={{ gap: 12 }}>
      <View style={s.row}>
        <Text style={[s.sec, { color: colors.text, flex: 1 }]}>{n > 1 ? "Your positions" : "Your position"}</Text>
        {n > 1 && <Text style={[s.lg, { color: colors.text }]}>{usd(mine.reduce((t, [, m]) => t + m.value, 0) + linked.reduce((t, r) => t + r.value, 0))}</Text>}
      </View>
      {mine.map(([p, m]) => <PosBlock key={p.id} e={e} p={p} m={m} onBuy={onBuy} />)}
      {linked.length > 0 && (
        <>
          <Text style={[s.sec, { color: colors.text }]}>Linked wallets</Text>
          <BetList rows={linked} />
        </>
      )}
    </Card>
  );
}
function PosBlock({ e, p, m, onBuy }: { e: Ev; p: (typeof P.pos)[number]; m: ReturnType<typeof pmx>; onBuy: (o: Out, s: Side, mode: "buy" | "sell") => void }) {
  const { colors } = useTheme();
  const [tip, setTip] = useTip();
  const L = lab(m.o, p.side), [pa, pn] = cpair(p.avg * 100, m.mk * 100);
  const head = (
    <View style={s.row}>
      <SideTag side={p.side} label={L} />
      <Text style={[s.b, { color: colors.text, flex: 1 }]} numberOfLines={1}>{mName(e, m.o)}</Text>
      {m.res ? <Chip label={m.won ? "Won" : "Lost"} tone={m.won ? "teal" : "grey"} /> : p.src === "world" ? <SrcBadge src="world" /> : null}
    </View>
  );
  if (m.res) {
    return (
      <View style={[s.pb, { backgroundColor: colors.bg }]}>
        {head}
        <Pairs n={2} items={[{ label: "Shares", value: shf(m.tot), sub: p.yld ? `${shf(p.yld)} from yield` : undefined }, { label: "Avg / result", value: `${pa} → ${pn}` }, { label: "Pays", value: usd(m.value) }, { label: "Profit", value: sUsd(m.pnl), sub: `on ${usd(m.cost)}`, tone: m.pnl >= 0 ? "pos" : "neg" }]} />
        {m.won && <Button label="Claim" size="md" fam={families.predict} onPress={() => runClaim(p.id, true)} />}
      </View>
    );
  }
  const sd = m.sd, ph = pairingHist(m.o, p.side), a = ph[ph.length - 2], b = ph[ph.length - 1];
  return (
    <View style={[s.pb, { backgroundColor: colors.bg }]}>
      {head}
      {m.merging ? (
        <Chip label="Joining the pool" tone="pink" />
      ) : (
        <View style={{ gap: 6 }}>
          <View style={s.row}>
            <Text style={[s.capB, { color: colors.text }]}>Paired {pp(sd.share)}</Text>
            <TipBtn k="paired" open={tip} setOpen={setTip} label="What paired means" />
            <View style={{ flex: 1 }} />
            <Chip label={p2(m.apy)} tone="teal" />
          </View>
          <Meter f={sd.share} />
          <Text style={[s.cap, { color: colors.muted }]}>{shf(m.tot * sd.share)} of {shf(m.tot)}{a && b && a.v !== b.v ? `, ${a.v}% to ${b.v}% ${b.t}` : ""}</Text>
          <TipBox k="paired" open={tip}><Tips k="paired" /></TipBox>
        </View>
      )}
      <Pairs n={2} items={[{ label: "Shares", value: shf(m.tot), sub: p.yld ? `${shf(p.yld)} from yield` : undefined }, { label: "Avg / now", value: `${pa} → ${pn}` }, { label: "Value", value: usd(m.value), sub: sUsd(m.pnl), tone: undefined }, { label: "Earned", value: sUsd(m.earned), tone: "pos" }, { label: "Pays if right", value: usd(m.pays) }]} />
      <View style={s.row}>
        <Button label="Sell" size="md" v="dark" style={{ flex: 1 }} onPress={() => onBuy(m.o, p.side, "sell")} />
        <IconAction icon="add" label="Buy more" onPress={() => onBuy(m.o, p.side, "buy")} />
      </View>
    </View>
  );
}

/* ---------- tabs ---------- */
function EarnTab({ e, o, onPick }: { e: Ev; o: Out; onPick: (k: string) => void }) {
  const { colors } = useTheme();
  const [tip, setTip] = useTip();
  const ops = openOuts(e), a = poolSide(o, "yes"), b = poolSide(o, "no");
  const tot = o.pool.yes + o.pool.no || 1, mn = Math.min(o.pool.yes, o.pool.no);
  const legRow = (sd: Side, x: ReturnType<typeof poolSide>) => (
    <View key={sd} style={s.row}>
      <SideTag side={sd} label={lab(o, sd)} />
      <Text style={[s.cap, { color: colors.muted, flex: 1 }]}>{nf(o.pool[sd])}, {x.full ? "all paired" : `${nf(x.waiting)} waiting`}</Text>
      <Text style={[s.capB, { color: x.full ? colors.positive : colors.text }]}>{p2(x.apy)}</Text>
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <View style={s.row}>
        <Text style={[s.body, { color: colors.text, flex: 1 }]}>{ops.length > 1 ? `${o.name}: ` : ""}<Text style={{ fontFamily: font.semibold }}>{nf(pairsOf(o))} pairs earning {p2(RATE())}</Text></Text>
        <TipBtn k="pairs" open={tip} setOpen={setTip} label="What a pair is" />
      </View>
      <TipBox k="pairs" open={tip}><Tips k="pairs" /></TipBox>
      <View style={{ flexDirection: "row", height: 12, gap: 2 }} accessibilityRole="image" accessibilityLabel={`${yl(o)} ${nf(o.pool.yes)}, ${nl(o)} ${nf(o.pool.no)}, ${nf(mn)} pairs`}>
        {(["yes", "no"] as Side[]).map((sd) => (
          <View key={sd} style={{ width: `${(o.pool[sd] / tot) * 100}%`, height: 12, borderRadius: 6, backgroundColor: sd === "yes" ? colors.blueTint : colors.pinkTint, overflow: "hidden" }}>
            <View style={{ width: `${o.pool[sd] ? (mn / o.pool[sd]) * 100 : 0}%`, height: 12, backgroundColor: sd === "yes" ? "#2440A9" : colors.negative }} />
          </View>
        ))}
      </View>
      {legRow("yes", a)}
      {legRow("no", b)}
      {ops.length > 1 && (
        <View>
          <View style={[s.row, { minHeight: 32 }]}>
            {["Market", "Pairs", `${yl(ops[0])} earns`, `${nl(ops[0])} earns`].map((h, i) => <Text key={h} style={[s.cap, { color: colors.muted, flex: i === 0 ? 1.4 : 1, textAlign: i === 0 ? "left" : "right" }]} numberOfLines={1}>{h}</Text>)}
          </View>
          {ops.map((x) => {
            const ya = poolSide(x, "yes"), na = poolSide(x, "no");
            return (
              <Pressable key={x.k} onPress={() => onPick(x.k)} accessibilityRole="button" style={[s.row, { minHeight: 40, borderRadius: 8, backgroundColor: x.k === o.k ? colors.blueTint : "transparent", paddingHorizontal: 4 }]}>
                <Text style={[s.cap, { color: colors.text, flex: 1.4 }]} numberOfLines={1}>{x.name}</Text>
                <Text style={[s.cap, { color: colors.text, flex: 1, textAlign: "right" }]}>{nf(pairsOf(x))}</Text>
                <Text style={[s.cap, { color: ya.full ? colors.positive : colors.text, flex: 1, textAlign: "right" }]}>{p2(ya.apy)}</Text>
                <Text style={[s.cap, { color: na.full ? colors.positive : colors.text, flex: 1, textAlign: "right" }]}>{p2(na.apy)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function BookTab({ e, o, sd, setSd }: { e: Ev; o: Out; sd: Side; setSd: (s: Side) => void }) {
  const { colors } = useTheme();
  const asks = levels(o, sd, 1).slice(0, 5), bids = levels(o, sd, -1).slice(0, 5), mx = Math.max(...asks.map((x) => x.q), ...bids.map((x) => x.q));
  const cumul = (ls: { p: number; q: number }[]) => ls.map((x, i) => ({ ...x, cum: ls.slice(0, i + 1).reduce((t, y) => t + (y.q * y.p) / 100, 0) }));
  const askRows = cumul(asks), bidRows = cumul(bids);
  const row = (x: { p: number; q: number; cum: number }, a: boolean) => (
    <View key={(a ? "a" : "b") + x.p} style={[s.row, { minHeight: 32 }]}>
      <View style={{ position: "absolute", right: 0, top: 2, bottom: 2, width: `${(x.q / mx) * 100}%`, backgroundColor: a ? colors.pinkTint : colors.tealTint, borderRadius: 4 }} />
      <Text style={[s.cap, { color: a ? colors.negative : colors.positive, flex: 1, paddingLeft: 4, fontFamily: font.semibold }]}>{cf(x.p)}</Text>
      <Text style={[s.cap, { color: colors.text, flex: 1, textAlign: "right" }]}>{nf(x.q)}</Text>
      <Text style={[s.cap, { color: colors.text, flex: 1, textAlign: "right", paddingRight: 4 }]}>{usd(x.cum, 0)}</Text>
    </View>
  );
  return (
    <View>
      <View style={[s.row, { marginBottom: 8 }]}>
        {(["yes", "no"] as Side[]).map((k) => (
          <Pressable key={k} onPress={() => setSd(k)} accessibilityRole="tab" accessibilityState={{ selected: sd === k }} style={[s.rc, { backgroundColor: sd === k ? (k === "yes" ? colors.blueTint : colors.pinkTint) : colors.segment }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: sd === k ? (k === "yes" ? colors.onBlueTint : colors.onPinkTint) : colors.text }}>{lab(o, k)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[s.row, { minHeight: 28 }]}>
        <Text style={[s.cap, { color: colors.muted, flex: 1 }]} numberOfLines={1}>{lab(o, sd)}{openOuts(e).length > 1 ? `, ${o.name}` : ""}</Text>
        <Text style={[s.cap, { color: colors.muted, flex: 1, textAlign: "right" }]}>Shares</Text>
        <Text style={[s.cap, { color: colors.muted, flex: 1, textAlign: "right" }]}>Total</Text>
      </View>
      {askRows.slice().reverse().map((x) => row(x, true))}
      <View style={[s.row, { justifyContent: "space-between", minHeight: 36, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider }]}>
        <Text style={[s.cap, { color: colors.muted }]}>Spread {cf(ask(o, sd) - bid(o, sd))}</Text>
        <Text style={[s.cap, { color: colors.muted }]}>Best ask {cf(ask(o, sd))}</Text>
      </View>
      {bidRows.map((x) => row(x, false))}
    </View>
  );
}

function RulesTab({ e }: { e: Ev }) {
  const { colors } = useTheme();
  const rows: [string, string][] = [["Resolver", "World operator, on chain"], ["Winning share pays", "$1 (1 CASH)"], ["Losing share", "Worth $0"], ["Source", e.source], ["Market opened", e.opened || "—"], ["Ends", e.ends]];
  return (
    <View style={{ gap: 8 }}>
      <Text style={[s.body, { color: colors.text }]}>{e.rules}</Text>
      {rows.map(([l, v], i) => (
        <View key={l} style={[s.row, { minHeight: 44, alignItems: "flex-start", paddingVertical: 10 }, i === 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
          <Text style={[s.body, { color: colors.muted, flex: 1 }]}>{l}</Text>
          <Text style={[s.b, { color: colors.text, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function ActTab({ e }: { e: Ev }) {
  const { colors } = useTheme();
  const ops = openOuts(e);
  // a stable, seeded feed (same each open): recent buys, sells and new pairs
  let seed = 0;
  for (let i = 0; i < e.id.length; i++) seed = (seed * 31 + e.id.charCodeAt(i)) >>> 0;
  const r = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const mins = [2, 7, 15, 33, 58, 96, 140, 210];
  const rows = mins.map((m, i) => {
    const o = ops[Math.floor(r() * ops.length)], sd: Side = r() < 0.6 ? "yes" : "no", t = m < 60 ? m + "m ago" : Math.round(m / 60) + "h ago";
    if (i % 3 === 2) return { t, o, title: "New pairs", right: `+${nf(Math.round(40 + r() * 400))} earning`, pos: true, sd: null as Side | null };
    const buy = r() < 0.7, n = Math.round(20 + r() * 480), px = buy ? ask(o, sd) : bid(o, sd);
    return { t, o, title: buy ? "Buy" : "Sell", right: `${nf(n)} at ${cf(px)}`, pos: false, sd };
  });
  return (
    <View>
      {rows.map((x, i) => (
        <View key={i} style={[s.row, { minHeight: 52 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
          <Text style={[s.cap, { color: colors.muted, width: 64 }]}>{x.t}</Text>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={[s.row, { gap: 6 }]}>
              <Text style={[s.body, { color: colors.text }]}>{x.title}</Text>
              {x.sd && <SideTag side={x.sd} label={lab(x.o, x.sd)} />}
            </View>
            {ops.length > 1 && <Text style={[s.cap, { color: colors.muted }]} numberOfLines={1}>{x.o.name}</Text>}
          </View>
          <Text style={[s.b, { color: x.pos ? colors.positive : colors.text, fontVariant: ["tabular-nums"] }]}>{x.right}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 16, gap: 12, paddingBottom: 24 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  b: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  capB: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  small: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14 },
  sec: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24 },
  h1: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  lg: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24, fontVariant: ["tabular-nums"] },
  or: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 64, padding: 8, borderRadius: 12 },
  pb: { padding: 12, borderRadius: 14, gap: 12 },
  rc: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  axis: { position: "absolute", right: 0, width: 36, textAlign: "right", fontFamily: font.regular, fontSize: 11 },
  xl: { position: "absolute", bottom: 0, fontFamily: font.regular, fontSize: 11 },
  foot: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
});
