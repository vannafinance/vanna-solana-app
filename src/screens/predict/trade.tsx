import { router } from "expo-router";
import { useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/kit";
import { nf, sUsd, usd } from "@/format";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet, openSheet } from "@/ui/overlay";
import { runTx, type TxSpec } from "@/ui/tx";

import {
  ask, bid, byChance, cf, claimSpec, cpair, EVM, type Ev, fmtAmt, heldOf, lab, mainOuts, newTrade, openOuts, OUT, type Out, p2, pc, pp, quote, RATE, setLastPay, shf,
  type Side, side as poolSide, team, tradeSpec, twinOf, type Trade, whenOf,
} from "./model";
import { Meter, OutIcon, SideTag, TeamLogo, TipBox, TipBtn, Tips, useTip } from "./ui";

/* The trade panel (design SHEETS['pd-trade']): Buy | Sell, outcome picker, Yes / No, amount with quick fills, the earning block,
   "Pays if right"; the pinned footer holds the single CTA. One trade state is shared by the body and its footer. */
let cur: Trade | null = null;
const subs = new Set<() => void>();
const setTrade = (p: Partial<Trade> | null) => {
  cur = p === null ? null : ({ ...cur, ...p } as Trade);
  subs.forEach((f) => f());
};
const useTrade = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => cur);

// Where the next transaction's "View my bets" goes: the Predict tab request (Lend listens), leaving the event page when we are on it.
const tabReq = new Set<(t: "positions") => void>();
export const onTabRequest = (f: (t: "positions") => void) => (tabReq.add(f), () => void tabReq.delete(f));
function goBets(fromEvent: boolean) {
  tabReq.forEach((f) => f("positions"));
  if (fromEvent && router.canGoBack()) router.back();
}

export function runSpec(spec: (Omit<TxSpec, "chain" | "fam"> & { view?: unknown }) | null, fromEvent = false) {
  if (!spec) return;
  const { view, ...rest } = spec;
  void view;
  const tx: TxSpec = { chain: "solana", fam: families.predict, ...rest, done: { ...rest.done, action: ["View my bets", () => goBets(fromEvent)] } };
  runTx(tx);
}
export function runClaim(id: string, fromEvent = false) {
  const spec = claimSpec(id);
  if (spec) runTx({ chain: "solana", fam: families.predict, ...spec, done: { ...spec.done, action: ["View my bets", () => goBets(fromEvent)] } });
}

export function openTrade(e: Ev, o: Out, sd?: Side, mode: "buy" | "sell" = "buy", fromEvent = false) {
  setTrade(null);
  setTrade(newTrade(e, o.k, sd, mode));
  openSheet({
    title: `${mode === "sell" ? "Sell" : "Buy"} ${lab(o, sd ?? "yes")}`,
    startLarge: true,
    content: () => <TradePanel />,
    footer: () => <TradeFooter fromEvent={fromEvent} />,
  });
}

function TradeFooter({ fromEvent }: { fromEvent: boolean }) {
  useDataVersion();
  const t = useTrade();
  const e = EVM(t?.ev), o = OUT(e, t?.m);
  if (!t || !e || !o) return null;
  const Q = quote(e, o, t);
  if (Q.cta[2] === "empty") return null;
  return (
    <Button
      label={Q.cta[0]}
      v={Q.sell ? "dark" : "primary"}
      fam={families.predict}
      disabled={Q.cta[1]}
      onPress={() => {
        const spec = tradeSpec(t);
        if (!spec) return;
        closeSheet();
        setTimeout(() => runSpec(spec, fromEvent), 300);
      }}
    />
  );
}

function TradePanel() {
  useDataVersion();
  const { colors } = useTheme();
  const t = useTrade();
  const [tip, setTip] = useTip();
  const e = EVM(t?.ev), o = OUT(e, t?.m);
  if (!t || !e || !o) return null;
  const Q = quote(e, o, t), sell = Q.sell, heldAny = heldOf(e, o, "yes") + heldOf(e, o, "no"), multi = openOuts(e).length > 1;
  const [py, pn] = sell ? cpair(bid(o, "yes"), bid(o, "no")) : cpair(ask(o, "yes"), ask(o, "no"));
  const maxW = Math.floor((Q.wal || 0) * 100) / 100;
  const fills: [string, number][] = sell
    ? [["25%", 0.25], ["50%", 0.5], ["Max", 1]].map(([l, f]) => [l as string, Math.floor(Q.held * (f as number) * 100) / 100])
    : [["$10", 10], ["$50", 50], ["$100", 100], ["Max", maxW]];
  const over = Q.cta[1] && /^Not enough/.test(Q.cta[0]);
  const chooseSide = (sd: Side) => {
    if (t.mode === "sell") {
      const h = heldOf(e, o, sd);
      setTrade(h ? { side: sd, amt: fmtAmt(String(Math.floor(h * 100) / 100)) } : { side: sd, mode: "buy", amt: "100" });
    } else setTrade({ side: sd });
  };
  const setMode = (m: "buy" | "sell") => {
    if (m === t.mode) return;
    if (m === "sell") {
      const sd = heldOf(e, o, t.side) ? t.side : (["yes", "no"] as Side[]).find((z) => heldOf(e, o, z));
      if (sd) setTrade({ side: sd, mode: "sell", amt: fmtAmt(String(Math.floor(heldOf(e, o, sd) * 100) / 100)) });
    } else setTrade({ mode: "buy", amt: "100" });
  };
  const L = lab(o, t.side), other: Side = t.side === "yes" ? "no" : "yes", od = poolSide(o, other), tw = twinOf(e, o, t.side);
  const mo = (Q.a * Q.after.share * RATE()) / 100 / 12, drop = Q.held > 0 && Q.after.apy < Q.before.apy - 0.005;
  return (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      {!multi && (
        <View style={s.row}>
          <OutIcon e={e} o={o} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={[s.b, { color: colors.text }]} numberOfLines={1}>{e.outs.length > 1 ? o.name : e.title}</Text>
            <Text style={[s.cap, { color: colors.muted }]} numberOfLines={1}>{e.outs.length > 1 ? e.title : whenOf(e)}</Text>
          </View>
        </View>
      )}
      {heldAny > 0 && (
        <View style={[s.seg, { backgroundColor: colors.segment }]}>
          {(["buy", "sell"] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="tab" accessibilityState={{ selected: t.mode === m }} style={[s.segI, t.mode === m && { backgroundColor: colors.segmentActive }]}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{m === "buy" ? "Buy" : "Sell"}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {multi && <OutSelect e={e} o={o} t={t} />}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["yes", "no"] as Side[]).map((sd, i) => {
          const on = t.side === sd, y = sd === "yes";
          return (
            <Pressable key={sd} onPress={() => chooseSide(sd)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[s.sd, { borderColor: on ? (y ? "#2440A9" : colors.negative) : colors.border, backgroundColor: on ? (y ? colors.blueTint : colors.pinkTint) : colors.surface }]}>
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: on ? (y ? colors.onBlueTint : colors.onPinkTint) : colors.text }}>{lab(o, sd)}</Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: on ? (y ? colors.onBlueTint : colors.onPinkTint) : colors.text, fontVariant: ["tabular-nums"] }}>{i ? pn : py}</Text>
            </Pressable>
          );
        })}
      </View>
      <Card style={{ backgroundColor: colors.bg }}>
        <View style={s.row}>
          <View style={[s.row, { gap: 6 }]}>
            <Text style={[s.cap, { color: colors.muted }]}>{sell ? "Shares" : "Amount"}</Text>
            {!sell && <TipBtn k="pay" open={tip} setOpen={setTip} label="Pay with USDC or CASH" />}
          </View>
          <Text style={[s.cap, { color: colors.muted, flex: 1, textAlign: "right" }]} numberOfLines={1}>{sell ? `Held ${shf(Q.held)}` : `Balance ${nf(Q.wal, 2)} ${t.pay}`}</Text>
        </View>
        <TipBox k="pay" open={tip}><Tips k="pay" /></TipBox>
        <View style={s.row}>
          <TextInput
            value={t.amt}
            onChangeText={(v) => setTrade({ amt: fmtAmt(v) })}
            placeholder="0"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            accessibilityLabel={sell ? "Shares to sell" : `Amount in ${t.pay}`}
            style={[s.in, { flex: 1, minWidth: 0, color: over ? colors.negative : colors.text }]}
          />
          {sell ? (
            <View style={[s.row, { gap: 6 }]}><SideTag side={t.side} label={L} /><Text style={[s.cap, { color: colors.muted }]}>shares</Text></View>
          ) : (
            <View style={[s.pay, { backgroundColor: colors.segment }]}>
              {(["USDC", "CASH"] as const).map((k) => (
                <Pressable key={k} onPress={() => { setLastPay(k); setTrade({ pay: k }); }} accessibilityRole="button" accessibilityLabel={`Pay with ${k}`} accessibilityState={{ selected: t.pay === k }}
                  style={[s.payI, t.pay === k && { backgroundColor: colors.segmentActive }]}>
                  <TokenLogo sym={k} size={20} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>{k}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {fills.map(([l, v]) => {
            const on = Q.a > 0 && Math.abs(Q.a - v) < 1e-9;
            return (
              <Pressable key={l} onPress={() => setTrade({ amt: v > 0 ? fmtAmt(String(v)) : "" })} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={[s.qf, { borderColor: on ? "#2440A9" : colors.border, backgroundColor: on ? colors.blueTint : colors.surface }]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? colors.onBlueTint : colors.text }}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {!sell ? (
        <>
          <View style={[s.eb, { backgroundColor: colors.blueTint }]}>
            <View style={s.row}>
              <Icon name="savings" size={18} color={colors.onBlueTint} />
              <Text style={[s.b, { color: colors.onBlueTint }]}>Earns</Text>
              <TipBtn k="earnLine" open={tip} setOpen={setTip} label="How these shares earn" />
              <Text style={[s.b, { color: colors.onBlueTint, flex: 1, textAlign: "right" }]}>{p2(Q.after.apy)} APY</Text>
            </View>
            <TipBox k="earnLine" open={tip}><Tips k="earnLine" /></TipBox>
            <View style={s.row}>
              <Text style={[s.cap, { color: colors.onBlueTint }]}>Paired</Text>
              <Meter f={Q.after.share} />
              <Text style={[s.capB, { color: colors.onBlueTint }]}>{pp(Q.after.share)}</Text>
            </View>
            {Q.held > 0 && (
              <View style={s.row}>
                <Text style={[s.cap, { color: colors.onBlueTint, flex: 1 }]}>Your position</Text>
                <Text style={[s.capB, { color: drop ? colors.warning : colors.onBlueTint }]}>{p2(Q.before.apy)} → {p2(Q.after.apy)}</Text>
              </View>
            )}
            <View style={s.row}>
              <Text style={[s.cap, { color: colors.onBlueTint, flex: 1 }]}>Monthly yield</Text>
              <Text style={[s.capB, { color: colors.onBlueTint }]}>{Q.a ? "~" + usd(mo) : "—"}</Text>
            </View>
            {!Q.after.full && od.full && <Text style={[s.cap, { color: colors.onBlueTint }]}>{lab(o, other)} earns {p2(od.apy)} (fully paired)</Text>}
          </View>
          {tw && (
            <View style={[s.row, s.twin, { backgroundColor: colors.bg }]}>
              <TeamLogo o={tw.o} size={20} />
              <Text style={[s.cap, { color: colors.text, flex: 1 }]}>Same bet: <Text style={{ fontFamily: font.semibold }}>{tw.o.name} {lab(tw.o, tw.s)}</Text> {cf(ask(tw.o, tw.s))}, {p2(poolSide(tw.o, tw.s).apy)}{tw.tie ? " (not in a tie)" : ""}</Text>
              <Pressable onPress={() => setTrade({ m: tw.o.k, side: tw.s })} hitSlop={8} accessibilityRole="button"><Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.link }}>Switch</Text></Pressable>
            </View>
          )}
          <View>
            <Pressable onPress={() => setTrade({ det: !t.det })} accessibilityRole="button" accessibilityState={{ expanded: t.det }} style={[s.row, { minHeight: 44 }]}>
              <Text style={[s.body, { color: colors.text, flex: 1 }]}>Pays if right</Text>
              {Q.a > 0 ? <><Text style={[s.b, { color: colors.positive }]}>{usd(Q.q.sh)}</Text><Text style={[s.cap, { color: colors.positive }]}>{sUsd(Q.q.sh - Q.a)}</Text></> : <Text style={[s.body, { color: colors.muted }]}>—</Text>}
              <Icon name={t.det ? "expand_less" : "expand_more"} size={20} color="muted" />
            </Pressable>
            {t.det && (
              <View>
                <DRow l="Avg price" v={cf(Q.a ? Q.q.avg : ask(o, t.side))} />
                <DRow l="Shares" v={Q.a ? shf(Q.q.sh) : "—"} />
                <DRow l="Profit if right" v={Q.a ? `${sUsd(Q.q.sh - Q.a)} (${nf(((Q.q.sh - Q.a) / Q.a) * 100, 0)}%)` : "—"} pos />
              </View>
            )}
          </View>
        </>
      ) : (
        <View>
          <DRow l="Avg price" v={cf(Q.n ? Q.q.avg : bid(o, t.side))} />
          <DRow l="You receive" v={Q.n ? usd(Q.q.usd) : "—"} pos />
          <DRow l="Includes yield" v={Q.n ? `${shf(Q.ySh)} shares` : "—"} />
          <DRow l="P&L" v={Q.n ? sUsd(Q.pnl) : "—"} pos={Q.n > 0 && Q.pnl >= 0} neg={Q.n > 0 && Q.pnl < 0} />
          {(Q.r.fromPool > 0.005 || Q.r.needUsd > 0.005) && (
            <View style={[s.eb, { backgroundColor: colors.bg, marginTop: 8 }]}>
              <Text style={[s.cap, { color: colors.text }]}>
                {[Q.r.fromPool > 0.005 ? `${shf(Q.r.fromPool)} unpaired first` : "", Q.r.needUsd > 0.005 ? `${usd(Q.r.needUsd)} from the pool` : ""].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}
        </View>
      )}
      <Text style={[s.cap, { color: colors.muted }]}>$1 per winning share, {e.source}.</Text>
    </View>
  );
}

function DRow({ l, v, pos, neg }: { l: string; v: string; pos?: boolean; neg?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[s.row, { minHeight: 40 }]}>
      <Text style={[s.body, { color: colors.muted, flex: 1 }]}>{l}</Text>
      <Text style={[s.b, { color: pos ? colors.positive : neg ? colors.negative : colors.text, fontVariant: ["tabular-nums"] }]}>{v}</Text>
    </View>
  );
}

// Outcome picker for multi-outcome events (a collapsed row that opens the list).
function OutSelect({ e, o, t }: { e: Ev; o: Out; t: Trade }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const list = openOuts(e), k = { match: "Market", date: "Date", strike: "Target", multi: "Outcome" }[e.type as string] ?? "Market";
  const groups: [string, Out[]][] =
    e.type === "match"
      ? ([["Winner", list.filter((x) => !x.grp)], ["Spread", list.filter((x) => x.grp === "spread")], ["Total runs", list.filter((x) => x.grp === "total")]] as [string, Out[]][]).filter((g) => g[1].length)
      : [["", e.type === "multi" ? list.slice().sort(byChance) : list]];
  const pick = (x: Out) => {
    setOpen(false);
    const held = heldOf(e, x, t.side);
    setTrade(t.mode === "sell" && !held ? { m: x.k, mode: "buy", amt: "100" } : t.mode === "sell" ? { m: x.k, amt: fmtAmt(String(Math.floor(held * 100) / 100)) } : { m: x.k });
  };
  void mainOuts;
  return (
    <View style={[s.osel, { borderColor: colors.border }]}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={[s.row, { minHeight: 48, paddingHorizontal: 12 }]}>
        <Text style={[s.cap, { color: colors.muted }]}>{k}</Text>
        {team(o) && <TeamLogo o={o} size={20} />}
        <Text style={[s.b, { color: colors.text, flex: 1 }]} numberOfLines={1}>{o.name}</Text>
        <Text style={[s.body, { color: colors.text, fontVariant: ["tabular-nums"] }]}>{pc(o.y)}</Text>
        <Icon name={open ? "expand_less" : "expand_more"} size={20} color="muted" />
      </Pressable>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
          {groups.map(([g, xs]) => (
            <View key={g || "all"}>
              {!!g && <Text style={[s.capB, { color: colors.muted, paddingHorizontal: 12, paddingTop: 8 }]}>{g}</Text>}
              {xs.map((x) => (
                <Pressable key={x.k} onPress={() => pick(x)} accessibilityRole="button" accessibilityState={{ selected: x.k === o.k }} style={[s.row, { minHeight: 44, paddingHorizontal: 12, backgroundColor: x.k === o.k ? colors.blueTint : "transparent" }]}>
                  {team(x) && <TeamLogo o={x} size={20} />}
                  <Text style={[s.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{x.name}</Text>
                  <Text style={[s.b, { color: colors.text, fontVariant: ["tabular-nums"] }]}>{pc(x.y)}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  b: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  capB: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  seg: { flexDirection: "row", padding: 4, borderRadius: 14, gap: 4 },
  segI: { flex: 1, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  sd: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  in: { fontFamily: font.semibold, fontSize: 32, paddingVertical: 4 },
  pay: { flexDirection: "row", padding: 3, borderRadius: 18, gap: 2 },
  payI: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 8, borderRadius: 15 },
  qf: { flex: 1, height: 36, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  eb: { padding: 12, borderRadius: 14, gap: 8 },
  twin: { padding: 12, borderRadius: 12 },
  osel: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
});
