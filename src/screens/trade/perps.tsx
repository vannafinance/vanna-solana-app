import { type Href, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { TokenLogo } from "@/components/brand";
import { AmountField, LevSlider, PctChips } from "@/components/form";
import { SubTabs, Swap } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, Tag } from "@/components/ui/kit";
import { type PriceMove, usePerpMarketsTicker } from "@/chain/markets-ticker";
import { perpMark } from "@/chain/perp-mark";
import { marginPda, PerpsCloseIncompleteError, PerpsCloseWithdrawError, PerpsOpenIncompleteError, phoenixTraderPda, prewarmPerps, solanaPerpsClose, solanaPerpsCloseMany, solanaPerpsOpen, solanaPerpsUnwrap, solanaPerpsWithdraw } from "@/chain/solana/actions";
import { PHOENIX_MARKETS } from "@/chain/solana/tokens";
import { hfFmt, levFmt, nf, pct, sign, spct, sUsd, tokFmt, usd } from "@/format";
import { ACTIVITY, DATA, PERP_HIST, type PerpHist, type PerpPos, type Side } from "@/sample/data";
import { openTx } from "@/components/history";
import { addPerpHist } from "@/state/activity-store";
import { acct, hasMargin, liqPriceOf, mbal, mTake, perpPnl, perpQty, simAcct } from "@/sample/model";
import { nowT } from "@/screens/earn/model";
import { openShare } from "@/screens/share/share";
import { type Chain, useChain } from "@/state/chain";
import { personalReady } from "@/state/personal";
import { inUseWallet } from "@/state/wallets";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet, openSheet } from "@/ui/overlay";
import { isAre, type Leg, type LegRun, names, partsToLegs, shortReason } from "@/ui/legs";
import type { BatchControl } from "@/chain/solana/submit";
import { rpc } from "@/chain/solana/rpc";
import { runTx, type TxRecover } from "@/ui/tx";

/* Perps on Phoenix (design screens/perps.js, Solana only): Markets | Positions | History | Account; a market page with the candles,
   the position card, order book | trades and Long / Short; the order ticket opens as a sheet over the market. */
export const fam = families.perps;
// fund: hourly funding %, oi and vol in USD, ch: 24 h change %. Live from Phoenix (src/chain/solana/phoenix.ts); mark / oracle are Phoenix's too (perpMark falls back to the oracle PX until the first frame).
export type Mkt = { k: string; pair: string; name: string; max: number; ch: number; fund: number; oi: number; vol: number; mark?: number; oracle?: number };
// 24 h change, hourly funding (%), open interest and 24 h volume come from Phoenix's live market feed (live.ts, market-live.ts:
// the same fields and formulas as the website's market bar). NaN = not read yet, shown as "—" (no design numbers).
// Max leverage matches Vanna's market book on chain (maxLeverageBps: 5x SOL/ETH/BTC, 3x TSLA/META, checked 2026-11-18); live.ts
// replaces it with the chain's value once the book has been read (readPerpMaxLeverage).
export const PERP_MKTS: Mkt[] = [
  { k: "SOL", pair: "SOLUSDC", name: "Solana", max: 5, ch: NaN, fund: NaN, oi: NaN, vol: NaN },
  { k: "ETH", pair: "ETHUSDC", name: "Ethereum", max: 5, ch: NaN, fund: NaN, oi: NaN, vol: NaN },
  { k: "BTC", pair: "BTCUSDC", name: "Bitcoin", max: 5, ch: NaN, fund: NaN, oi: NaN, vol: NaN },
  { k: "TSLA", pair: "TSLAUSDC", name: "Tesla", max: 3, ch: NaN, fund: NaN, oi: NaN, vol: NaN },
  { k: "META", pair: "METAUSDC", name: "Meta", max: 3, ch: NaN, fund: NaN, oi: NaN, vol: NaN },
];
// Whether the wallet's Phoenix trading account exists (a first trade sets it up in the same approval).
async function traderRegistered(): Promise<boolean> {
  const owner = inUseWallet("solana")?.full;
  if (!owner) return true;
  const r = await rpc<{ value: unknown }>("getAccountInfo", [phoenixTraderPda(marginPda(owner)), { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
  return !!r.value;
}

export const perpPair = (k: string) => PERP_MKTS.find((m) => m.k === k)?.pair ?? `${k}USDC`;
export const perpName = (k: string) => PERP_MKTS.find((m) => m.k === k)?.name ?? k;
const MAINT = 0.05, TAKER = 0.00035;
const px = perpMark;
const usdC = (n: number) => (n >= 1e6 ? "$" + nf(n / 1e6, 2) + "M" : n >= 1e3 ? "$" + nf(n / 1e3, 0) + "K" : usd(n));
export const priceFmt = (v: number) => usd(v, v >= 1000 ? 2 : v >= 1 ? 2 : 4);
// liquidation price of an isolated Phoenix position (maintenance 5%)
export const liqOf = (side: Side, entry: number, lev: number) => (side === "long" ? entry * (1 - 1 / lev + MAINT) : entry * (1 + 1 / lev - MAINT));
// funding to date per day (design sample, matches the position page's "Funding by day"); new positions accrue from the hourly rate
export const FUNDING: Record<string, [string, number, number][]> = {
  p1: [["Oct 7", 16, -1.0], ["Oct 6", 24, -1.52], ["Oct 5", 9, -0.5]],
  p2: [["Oct 7", 16, 0.25], ["Oct 6", 15, 0.2]],
};
export const fundingOf = (p: PerpPos) =>
  p.fundingUsd != null ? p.fundingUsd : FUNDING[p.id] ? FUNDING[p.id].reduce((t, d) => t + d[2], 0) : -(p.side === "long" ? 1 : -1) * p.coll * p.lev * ((PERP_MKTS.find((m) => m.k === p.k)?.fund ?? 0) / 100);
// Phoenix is cross-margined: one pool of USDC backs every position. Liquidation of a position (est.): the price where its share
// of the pool plus its P&L falls to the maintenance margin. Long: (entry*qty - coll) / (qty*(1 - m)); short: (entry*qty + coll) /
// (qty*(1 + m)). No such price (a long backed by more USDC than its size) = null, shown as "None".
export const pooledLiq = (side: Side, qty: number, entry: number, coll: number): number | null => {
  if (!(qty > 0) || !(entry > 0)) return null;
  const p = side === "long" ? (entry * qty - coll) / (qty * (1 - MAINT)) : (entry * qty + coll) / (qty * (1 + MAINT));
  return p > 0 ? p : null;
};
// Liquidation price as the website shows it (lib/solana/perps.ts): only the price where the whole margin account reaches health 1.10 when
// this market alone moves; None when no move of this market gets there. Phoenix's own zero-equity price is a separate figure (zeroEquityFor).
export const liqFor = (chain: Chain, p: PerpPos) => liqPriceOf(chain, p.k, p.side);
export const zeroEquityFor = (p: PerpPos) => pooledLiq(p.side, perpQty(p), p.entry, p.coll);
// Leverage as each website screen shows it: the trading screen's position row is the current size over its collateral (1.46x), the
// Portfolio table is the current size over its equity (2.95x). Both over all open positions and the shared Phoenix pool.
export function perpLevNow(chain: Chain, p: PerpPos, over: "collateral" | "equity"): number {
  const all = DATA[chain].perps;
  const exposure = all.reduce((t, x) => t + perpQty(x) * perpMark(x.k), 0);
  const coll = all.reduce((t, x) => t + x.coll, 0);
  const base = over === "collateral" ? coll : coll + all.reduce((t, x) => t + perpPnl(x), 0);
  return exposure > 0 && base > 0 ? exposure / base : p.lev;
}
// Time to the next hourly funding as mm:ss, as the website's market bar; ticks once a second where it is used.
export const fundingCountdown = () => {
  const d = new Date();
  const v = 3599 - (d.getMinutes() * 60 + d.getSeconds());
  return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
};
export function useFundingCountdown() {
  const [cd, setCd] = useState(fundingCountdown);
  useEffect(() => {
    const id = setInterval(() => setCd(fundingCountdown()), 1000);
    return () => clearInterval(id);
  }, []);
  return cd;
}
// Leverage chip: one decimal, two below 2x (0.98x must not read as 1x).
// A Perps trade row: shown now and kept on the phone for this wallet, so the open and the close are both still listed after a restart.
const logPerp = (chain: Chain, row: Omit<PerpHist, "ms" | "hash">, hash?: string) => addPerpHist(inUseWallet(chain)?.full, { ...row, hash });
export const levTag = (l: number) => `${l < 2 ? Number(l.toFixed(2)) : Number(l.toFixed(1))}x`;
// All USDC in Phoenix (shared by every position) and the order's base lots exactly as solanaPerpsOpen sizes them: collateral x
// leverage valued at the slippage limit price, rounded DOWN to the market's lot size.
export const phoenixPool = (d: (typeof DATA)[Chain]) => d.perps.reduce((t, p) => t + p.coll, 0) + d.phoenixIdle;
export const orderQty = (k: string, notional: number, limit: number) => {
  const ld = Object.values(PHOENIX_MARKETS).find((x) => x.sym === k)?.lotDecimals ?? 2;
  return limit > 0 ? Math.floor((notional / limit) * 10 ** ld) / 10 ** ld : 0;
};

export type PerpTab = "markets" | "positions" | "history" | "account";

export function Perps({ tab, setTab }: { tab: PerpTab; setTab: (t: PerpTab) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <SubTabs items={[["markets", "Markets"], ["positions", "Positions"], ["history", "History"], ["account", "Account"]]} value={tab} onChange={setTab} fam={fam} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>{tab === "markets" ? <Markets /> : tab === "positions" ? <Positions /> : tab === "history" ? <PerpHistory /> : <PhoenixAccount />}</View>
      </Swap>
    </View>
  );
}

// A price that flashes green (up) or red (down) for a moment each time it moves, like the website terminal.
function FlashPrice({ move, children }: { move?: PriceMove; children: string }) {
  const { colors } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!move) return;
    p.value = 1;
    p.value = withTiming(0, { duration: 900 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move?.n]);
  const st = useAnimatedStyle(() => ({ opacity: p.value * 0.22 }));
  return (
    <View style={{ borderRadius: 6, paddingHorizontal: 4, marginRight: -4 }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 6, backgroundColor: move?.dir === -1 ? colors.negative : colors.positive }, st]} />
      <Text style={[styles.t, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

function Markets() {
  useDataVersion();
  const { colors } = useTheme();
  const moves = usePerpMarketsTicker(PERP_MKTS, true);
  return (
    <Card style={{ paddingVertical: 4, gap: 0 }}>
      {PERP_MKTS.map((m, i) => {
        return (
          <Pressable key={m.k} onPress={() => router.push(`/trade/perp/${m.k}` as Href)} style={[styles.mr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]} accessibilityRole="button" accessibilityLabel={`${m.pair}, ${priceFmt(px(m.k))}, ${spct(m.ch)}`}>
            <TokenLogo sym={m.k} size={36} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.t, { color: colors.text }]}>{m.pair}</Text>
                <Tag label={`${m.max}x`} tone="grey" />
              </View>
              <Text style={[styles.cap, { color: colors.muted }]}>Vol {usdC(m.vol)} · OI {usdC(m.oi)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <FlashPrice move={moves[m.k]}>{priceFmt(px(m.k))}</FlashPrice>
              <Text style={[styles.cap, { color: m.ch >= 0 ? colors.positive : colors.negative }]}>{spct(m.ch)}</Text>
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

// Position card (design V5 T6): pair + side chip and P&L; Size, Liq. price, Funding inline with the close and share actions.
// The whole card opens the position page.
export function PositionCard({ p }: { p: PerpPos }) {
  const { colors } = useTheme();
  const { chain } = useChain();
  const pnl = perpPnl(p), size = perpQty(p) * px(p.k), f = fundingOf(p), liq = liqFor(chain, p);
  return (
    <Pressable onPress={() => router.push(`/trade/position/${p.id}` as Href)} accessibilityRole="button" accessibilityLabel={`${perpPair(p.k)} ${p.side}, open the position`}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TokenLogo sym={p.k} size={40} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.t, { color: colors.text, fontSize: 16 }]}>{perpPair(p.k)}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Tag label={`${p.side === "long" ? "Long" : "Short"} ${levTag(perpLevNow(chain, p, "collateral"))}`} tone={p.side} />
              <TokenLogo sym="PHOENIX" size={16} />
            </View>
            {p.pool != null && (
              <Text style={[styles.cap, { color: colors.muted }]}>{`On ${nf(p.pool, 2)} USDC shared Phoenix collateral`}</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.t, { fontSize: 17, color: sign(pnl) === "neg" ? colors.negative : colors.positive }]}>{sUsd(pnl)}</Text>
            <Text style={[styles.cap, { color: sign(pnl) === "neg" ? colors.negative : colors.positive }]}>{spct((pnl / p.coll) * 100)}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          {(
            [
              ["Size", usd(size), ""],
              ["Liq. price", liq ? priceFmt(liq) : "None", ""],
              ["Funding", sUsd(f), sign(f)],
            ] as [string, string, string][]
          ).map(([l, v, t]) => (
            <View key={l} style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.cap, { color: colors.muted }]}>{l}</Text>
              <Text numberOfLines={1} style={[styles.t, { fontSize: 14, color: t === "neg" ? colors.negative : t === "pos" ? colors.positive : colors.text }]}>{v}</Text>
            </View>
          ))}
          <IconAction icon="close" label={`Close ${perpPair(p.k)}`} tone="neg" onPress={() => closePosition(chain, p)} />
          <IconAction icon={shareIcon} label={`Share ${perpPair(p.k)}`} tone="plain" onPress={() => openShare({ kind: "perps", id: p.id })} />
        </View>
      </Card>
    </Pressable>
  );
}

// The controls every Perps send gets from the sheet (ui/legs.ts): its parts mapped onto the rows, Cancel and Stop.
const ctl = (r: LegRun, map: (i: number, total: number) => string | string[], stop = true): BatchControl => ({ onLeg: partsToLegs(r.onLeg, map), cancel: r.cancel, ...(stop ? { stop: r.stop } : null) });
// The USDC return after the last close: its own approval (the rows read "Approve once more"), one row however many parts.
const retCtl = (r: LegRun): BatchControl => ctl(r, () => "ret", false);

export function closePosition(chain: Chain, p: PerpPos) {
  const last = DATA[chain].perps.length === 1; // the last position: the USDC then goes home to the margin account (second approval), as on the website
  const pnl = perpPnl(p), back = p.coll + pnl - perpQty(p) * px(p.k) * TAKER;
  const real = personalReady(chain);
  const pair = perpPair(p.k);
  const close = (r: LegRun) => solanaPerpsClose({ market: p.k, side: p.side, control: ctl(r, () => "close", false), returnControl: retCtl(r) });
  runTx({
    chain, fam, title: `Close ${pair}`, cta: "Close position",
    legs: [{ l: "You close", v: `${p.side === "long" ? "Long" : "Short"} ${Number(p.lev.toFixed(1))}x ${p.k}`, s: `${tokFmt(perpQty(p), p.k)} at ${priceFmt(px(p.k))}` }, { l: last ? "Back to your margin account" : "Stays in Phoenix as collateral", v: `${nf(Math.max(0, back), 2)} USDC`, s: last ? "A second approval moves it home" : undefined }],
    rows: [["P&L", sUsd(pnl), pnl >= 0 ? "pos" : "neg"], ["Taker fee", usd(perpQty(p) * px(p.k) * TAKER)]],
    done: { title: `Closed ${p.k} ${p.side}`, line: last ? `${sUsd(pnl)} P&L. ${nf(Math.max(0, back), 2)} USDC is back in your margin account` : `${sUsd(pnl)} P&L, the USDC stays in Phoenix` },
    // the last position: close, then the USDC home (its own approval); otherwise one transaction
    plan: last
      ? [{ id: "close", label: `Close ${p.k} ${p.side}`, noun: `${p.k} ${p.side}`, stage: 0 }, { id: "ret", label: `Return ${nf(Math.max(0, back), 2)} USDC to margin`, noun: `${nf(Math.max(0, back), 2)} USDC`, stage: 1, approval: 1 }]
      : [{ id: "close", label: `Close ${p.k} ${p.side}`, stage: 0 }],
    copy: {
      doing: `Closing ${p.k} ${p.side}`,
      part: (ok: Leg[]): [string, string] => (ok.length ? [`Closed ${p.k} ${p.side}`, `${sUsd(pnl)} P&L. Your ${nf(Math.max(0, back), 2)} USDC stays in Phoenix for now.`] : ["Not closed", `${p.k} ${p.side} is still open.`]),
    },
    cancelable: true,
    run: close,
    // the close again if it is still open, else only the USDC return
    retryLegs: (only, r) => (only.includes("close") ? close(r) : solanaPerpsWithdraw(undefined, true, retCtl(r))),
    apply: (hash) => {
      // a real account is read again from the chain after the run; only the sample account is rewritten here
      if (!real) {
        const d = DATA[chain];
        d.perps = d.perps.filter((q) => q.id !== p.id);
        if (last) d.margin.avail.USDC = (d.margin.avail.USDC ?? 0) + Math.max(0, back);
        else d.phoenixIdle += Math.max(0, back);
        d.realized += pnl;
      }
      logPerp(chain, { t: nowT(), a: "Close / reduce", k: p.k, side: p.side, size: perpQty(p) * px(p.k), usdc: back, lev: p.lev, pnl }, hash);
      ACTIVITY[chain].unshift({ t: nowT(), area: "Perps", action: "Close", detail: `${pair} ${Number(p.lev.toFixed(1))}x on Phoenix`, amt: `${nf(Math.max(0, back), 2)} USDC`, usd: back, tx: "", sym: p.k });
    },
  });
}

// Close all positions / Withdraw from Phoenix (design px-closeall): the sheet is the review; every position closes at market on
// Phoenix, one transaction each, all sent together under one approval (so there is nothing to Stop), then everything (with the free
// collateral) goes back to the margin account in its own approval.
export function closeAll(chain: Chain) {
  const d = DATA[chain], ps = [...d.perps], idle = d.phoenixIdle;
  const real = personalReady(chain);
  const cs = ps.map((p) => {
    const pnl = perpPnl(p), fee = perpQty(p) * px(p.k) * TAKER;
    return { p, pnl, fee, back: p.coll + pnl - fee };
  });
  const fee = cs.reduce((t, c) => t + c.fee, 0), pnl = cs.reduce((t, c) => t + c.pnl - c.fee, 0), back = cs.reduce((t, c) => t + Math.max(0, c.back), 0) + idle;
  const n = ps.length;
  const s = n === 1 ? "" : "s";
  // closes these (part i = position i of the batch), then the return; the chain read after the send places any close that did not land
  const closeMany = async (r: LegRun, list: PerpPos[]) => {
    try {
      return await solanaPerpsCloseMany(list.map((p) => ({ market: p.k, side: p.side })), ctl(r, (i) => list[i]?.id ?? list[list.length - 1].id, false), retCtl(r));
    } catch (e) {
      if (e instanceof PerpsCloseIncompleteError) {
        list.forEach((p) => (e.stillOpen.some((x) => x.market === p.k) ? r.onLeg(p.id, "failed", { reason: "Still open on Phoenix." }) : r.onLeg(p.id, "done")));
        r.onLeg("ret", "not-sent");
      } else if (e instanceof PerpsCloseWithdrawError) {
        list.forEach((p) => r.onLeg(p.id, "done"));
        r.onLeg("ret", "failed", { reason: shortReason(e.message.replace(/^.*?Phoenix: /, "")) });
      }
      throw e;
    }
  };
  const withdrawAll = (r: LegRun) => solanaPerpsWithdraw(undefined, true, ctl(r, () => (n ? "ret" : "wd"), false));
  runTx({
    chain, fam, title: n ? "Close all positions" : "Withdraw from Phoenix", cta: n ? "Close all" : "Withdraw to margin",
    legs: [], rows: [],
    body: <CloseAllBody cs={cs} fee={fee} pnl={pnl} idle={idle} back={back} />,
    done: n
      ? { title: `Closed ${n} position${s}`, line: `${names(ps.map((p) => ({ id: p.id, label: p.k, phase: "done" as const })))} closed. ${nf(back, 2)} USDC is back in your margin account` }
      : { title: "Back in your margin account", line: `${nf(back, 2)} USDC moved from Phoenix to your margin account` },
    // One row per close (sent together), then the USDC home (its own approval).
    plan: n
      ? [...ps.map((p) => ({ id: p.id, label: `Close ${p.k} ${p.side}`, noun: p.k, stage: 0 })), { id: "ret", label: `Return ${nf(back, 2)} USDC to margin`, noun: `${nf(back, 2)} USDC`, stage: 1, approval: 1 }]
      : [{ id: "wd", label: `Move ${nf(back, 2)} USDC out of Phoenix`, stage: 0 }],
    copy: {
      doing: n ? `Closing ${n} position${s}` : `Moving ${nf(back, 2)} USDC out of Phoenix`,
      sentNoun: "Closes",
      part: (_ok: Leg[], left: Leg[]): [string, string] => {
        const lc = left.filter((l) => l.id !== "ret");
        if (!lc.length) return [`Closed ${n} position${s}`, "All closed. Your USDC stays in Phoenix for now."];
        if (lc.length === n) return ["Nothing was closed", `${names(lc)} ${isAre(lc)} still open.`];
        return [`Closed ${n - lc.length} of ${n}`, `${names(lc)} ${isAre(lc)} still open`];
      },
    },
    cancelable: true,
    run: (r) => (n ? closeMany(r, ps) : withdrawAll(r)),
    // only what did not land: the positions still open (then the return), or only the return
    retryLegs: (only, r) => {
      const list = ps.filter((p) => only.includes(p.id));
      return list.length ? closeMany(r, list) : withdrawAll(r);
    },
    apply: (hash) => {
      cs.forEach((c) => {
        logPerp(chain, { t: nowT(), a: "Close / reduce", k: c.p.k, side: c.p.side, size: perpQty(c.p) * px(c.p.k), usdc: c.back, lev: c.p.lev, pnl: c.pnl }, hash);
        ACTIVITY[chain].unshift({ t: nowT(), area: "Perps", action: "Close", detail: `${perpPair(c.p.k)} ${Number(c.p.lev.toFixed(1))}x on Phoenix`, amt: `${nf(Math.max(0, c.back), 2)} USDC`, usd: c.back, tx: "", sym: c.p.k });
      });
      // a real account is read again from the chain after the run; only the sample account is rewritten here
      if (!real) {
        const x = DATA[chain];
        x.perps = x.perps.filter((q) => !ps.some((p) => p.id === q.id));
        x.margin.avail.USDC = (x.margin.avail.USDC ?? 0) + back;
        x.phoenixIdle = 0;
        x.realized += pnl;
      }
      if (idle > 0.004) logPerp(chain, { t: nowT(), a: "Deposit to Phoenix", k: "", side: "", size: null, usdc: -idle }, hash);
    },
  });
}

function CloseAllBody({ cs, fee, pnl, idle, back }: { cs: { p: PerpPos; pnl: number }[]; fee: number; pnl: number; idle: number; back: number }) {
  const { colors } = useTheme();
  const n = cs.length;
  const row = (l: string, v: string, tone?: string) => (
    <View key={l} style={[styles.car, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.text }}>{l}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 14, color: tone === "pos" ? colors.positive : tone === "neg" ? colors.negative : colors.text, fontVariant: ["tabular-nums"] }}>{v}</Text>
    </View>
  );
  return (
    <View>
      <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.text, marginBottom: 8 }}>
        {n ? `${n} ${n === 1 ? "position closes" : "positions close"} at the market price on Phoenix, with one approval. Then the USDC goes back to your margin account (a second approval).` : `No open positions. ${nf(idle, 2)} USDC waits in Phoenix.`}
      </Text>
      {cs.map(({ p, pnl: v }) => (
        <View key={p.id} style={[styles.car, { minHeight: 48 }]}>
          <TokenLogo sym={p.k} size={28} />
          <Text style={{ width: 92, fontFamily: font.semibold, fontSize: 15, color: colors.text }} numberOfLines={1}>{perpPair(p.k)}</Text>
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Tag label={`${p.side === "long" ? "Long" : "Short"} ${Number(p.lev.toFixed(1))}x`} tone={p.side} />
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: v < 0 ? colors.negative : colors.positive, fontVariant: ["tabular-nums"] }}>{sUsd(v)}</Text>
        </View>
      ))}
      {n > 0 && row(`Fees (${nf(TAKER * 100, 3)}%)`, usd(fee))}
      {n > 0 && row("Realized P&L (est.)", sUsd(pnl), pnl < 0 ? "neg" : "pos")}
      {idle > 0.01 && row("Free collateral in Phoenix", `${nf(idle, 2)} USDC`)}
      {row("Back to margin account", `~${nf(back, 2)} USDC`)}
    </View>
  );
}

function Positions() {
  const { chain } = useChain();
  const ps = personalReady(chain) ? DATA[chain].perps : [];
  if (!ps.length) return <EmptyCard title="No open positions" module="trade" />;
  return (
    <>
      <CloseAllBar chain={chain} n={ps.length} />
      {ps.map((p) => (
        <PositionCard key={p.id} p={p} />
      ))}
    </>
  );
}

// "N open" with Close all (design px-closeall / Portfolio's bulk button): the sheet it opens is the review.
export function CloseAllBar({ chain, n }: { chain: Chain; n: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.oh}>
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.muted }}>{n} open</Text>
      <Pressable onPress={() => closeAll(chain)} style={[styles.ca, { borderColor: colors.borderControl }]} accessibilityRole="button" accessibilityLabel="Close all positions">
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>Close all</Text>
      </Pressable>
    </View>
  );
}

// History: one list, newest first: every open, close and move of USDC to or from Phoenix. Funding is a running cost on a position (not an event),
// so it lives on the position card and in the Account tab, not here. Rows open their numbers in place.
function PerpHistory() {
  const { colors } = useTheme();
  const rows = PERP_HIST;
  if (!rows.length) return <EmptyCard title="No trades yet" module="perps" />;
  return (
    <Card style={{ paddingVertical: 4, gap: 0 }}>
      {rows.map((h, i) =>
        h.a === "Open / increase" || h.a === "Close / reduce" ? (
          <TradeRow key={i} h={h} first={i === 0} />
        ) : (
          <View key={i} style={[styles.hr2, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <View style={[styles.ic, { backgroundColor: colors.segment }]}>
              <Icon name={h.a === "Account setup" ? "person" : h.usdc != null && h.usdc < 0 ? "north" : "south"} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.t, { color: colors.text }]}>{h.a === "Account setup" ? "Account opened" : h.usdc != null && h.usdc < 0 ? "Moved back to margin" : "Added to Phoenix"}</Text>
              <Text style={[styles.cap, { color: colors.muted }]}>{h.t}</Text>
            </View>
            <Text style={[styles.t, { color: colors.text }]}>{h.usdc != null ? `${nf(Math.abs(h.usdc), 2)} USDC` : "—"}</Text>
            {h.hash ? <IconAction icon="open_in_new" label="View on explorer" tone="plain" onPress={() => openTx(h.hash)} /> : null}
          </View>
        ),
      )}
    </Card>
  );
}

function TradeRow({ h, first }: { h: (typeof PERP_HIST)[number]; first: boolean }) {
  const open = h.a === "Open / increase";
  // An order's leverage is on the USDC it added; the position's is on all USDC in Phoenix. Say so when they differ.
  const differs = open && h.effLev != null && h.lev != null && Math.abs(h.effLev - h.lev) >= 0.05;
  return (
    <ExpRow
      first={first}
      lead={<TokenLogo sym={h.k} size={36} />}
      title={perpPair(h.k)}
      sub={
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Tag label={open ? "Open" : "Close"} tone="grey" />
            {h.side !== "" && <Tag label={`${h.side === "long" ? "Long" : "Short"}${h.lev != null ? ` ${levTag(h.lev)}` : ""}`} tone={h.side} />}
          </View>
          {differs && <HistNote text={`Position ${levTag(h.effLev!)} on ${nf(h.pool ?? 0, 2)} USDC shared Phoenix collateral`} />}
        </View>
      }
      time={h.t}
      hash={h.hash}
      value={open ? (h.size ? usd(h.size) : "—") : h.pnl != null ? sUsd(h.pnl) : "—"}
      tone={open || h.pnl == null ? "" : sign(h.pnl)}
      detail={[["Size", usd(h.size ?? 0)], ["Entry", h.entry ? priceFmt(h.entry) : "—"], ["Leverage", differs ? `${h.lev}x order · ${levTag(h.effLev!)} position` : h.lev != null ? `${h.lev}x` : "—"], ["Fees", usd((h.size ?? 0) * TAKER)], ["Funding", "—"]]}
    />
  );
}

function HistNote({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.cap, { color: colors.muted }]}>{text}</Text>;
}

function ExpRow({ lead, title, sub, time, value, tone, detail, first, hash }: { lead: React.ReactNode; title: string; sub: React.ReactNode; time?: string; value: string; tone?: string; detail: [string, string][]; first: boolean; hash?: string }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={!first && { borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Pressable onPress={() => setOpen(!open)} style={styles.hr2} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        {lead}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={[styles.t, { color: colors.text }]}>{title}</Text>
          {sub}
          {time && <Text style={[styles.cap, { color: colors.muted }]}>{time}</Text>}
        </View>
        <Text style={[styles.t, { color: tone === "pos" ? colors.positive : tone === "neg" ? colors.negative : colors.text }]}>{value}</Text>
        <Icon name={open ? "expand_less" : "expand_more"} size={20} color="muted" />
      </Pressable>
      {open && (
        <View style={{ paddingBottom: 12 }}>
          <Pairs n={3} items={[...detail, ...(hash ? [["Transaction", `${hash.slice(0, 4)}…${hash.slice(-4)}`] as [string, string]] : [])].map(([l, v]) => ({ label: l, value: v, tone: v.startsWith("+") ? "pos" : v.startsWith("−") ? "neg" : "" }))} />
          {hash ? (
            <Pressable onPress={() => openTx(hash)} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingTop: 8 }} accessibilityRole="link">
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.link }}>View on explorer</Text>
              <Icon name="open_in_new" size={16} color="link" />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

// Account (design V5 T6): the Phoenix account as six numbers.
function PhoenixAccount() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const mine = personalReady(chain);
  const coll = mine ? d.perps.reduce((t, p) => t + p.coll, 0) : 0, upnl = mine ? d.perps.reduce((t, p) => t + perpPnl(p), 0) : 0;
  const notional = mine ? d.perps.reduce((t, p) => t + perpQty(p) * px(p.k), 0) : 0;
  const fundingPaid = mine ? -d.perps.reduce((t, p) => t + Math.min(0, fundingOf(p)), 0) : 0;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TokenLogo sym="PHX" size={24} />
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: colors.text }}>Phoenix</Text>
      </View>
      <Pairs
        n={2}
        items={[
          { label: "Perps value", value: mine ? usd(coll + upnl + d.phoenixIdle) : "—" },
          { label: "Open P&L", value: mine ? sUsd(upnl) : "—", tone: mine ? sign(upnl) : undefined },
          { label: "Free collateral", value: mine ? usd(d.phoenixIdle) : "—" },
          { label: "Maintenance", value: mine ? usd(notional * 0.15) : "—" },
          { label: "Funding paid", value: mine ? usd(fundingPaid) : "—" },
          { label: "Fees paid", value: mine ? usd(notional * TAKER) : "—" },
        ]}
      />
      {/* with positions open, Close all already brings the free collateral back, so this only shows when nothing is open */}
      {mine && d.phoenixIdle > 0 && !d.perps.length && <Button label="Withdraw to margin" v="outline" size="md" onPress={() => closeAll(chain)} />}
    </Card>
  );
}

// Order ticket (design perps order sheet): Long | Short, slippage, collateral from the margin account's idle USDC, stepped leverage (0.5x steps).
export function openTicket(k: string, side: Side) {
  openSheet({ title: `${side === "long" ? "Long" : "Short"} ${perpPair(k)}`, content: () => <Ticket k={k} initial={side} /> });
}

export function Ticket({ k, initial, onDone }: { k: string; initial: Side; onDone?: () => void }) {
  useDataVersion();
  const { colors } = useTheme();
  const { chain } = useChain();
  const d = DATA[chain];
  const m = PERP_MKTS.find((x) => x.k === k)!;
  const [side, setSide] = useState<Side>(initial);
  // The website's defaults (lib/solana/perps.ts defaultSlippageBps): 2% on the stock markets (TSLA, META), whose Phoenix books can
  // trade ~1% away from the index, 1% elsewhere.
  const [slip, setSlip] = useState(k === "TSLA" || k === "META" ? 2 : 1);
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  const [levPicked, setLev] = useState(Math.min(3, m.max));
  // m.max follows the chain's market book (live.ts): if it arrives lower while the sheet is open, the order never asks for more.
  const lev = Math.min(levPicked, m.max);
  // While the sheet is open, get the fork ready for this market so the tap does not wait for it.
  useEffect(() => {
    prewarmPerps(k, inUseWallet("solana")?.full);
  }, [k]);
  const levLabel = `${Number(lev.toFixed(1))}x`;
  // Everything in the margin account is spendable (idle funds first, then collateral): the health check runs after the order.
  const avail = mbal(d, "USDC");
  // USDC already in Phoenix (an earlier deposit, or collateral of open positions) backs this order too: Phoenix is cross-margined.
  // With 0 typed, the order uses only that USDC (solanaPerpsOpen sizes it on the trader's collateral).
  const pool0 = personalReady(chain) ? phoenixPool(d) : 0;
  const c = parseFloat(amt) || 0, useExisting = c === 0 && amt.trim() !== "" && pool0 > 0.01;
  const base = c > 0 ? c : useExisting ? pool0 : 0, notional = base * lev, fee = notional * TAKER;
  const maxEntry = px(k) * (side === "long" ? 1 + slip / 100 : 1 - slip / 100);
  // What lands: lots sized at the limit price and rounded down to the lot size (0.01 SOL), as solanaPerpsOpen does.
  const qty = orderQty(k, notional, maxEntry), sizeUsd = qty * px(k);
  // After the order: all Phoenix collateral, this market's position (same side adds up), effective leverage and liquidation.
  const same = personalReady(chain) ? d.perps.filter((p) => p.k === k && p.side === side) : [];
  const poolAfter = pool0 + c;
  const qtyAfter = same.reduce((t, p) => t + perpQty(p), 0) + qty;
  const entryAfter = qtyAfter > 0 ? (same.reduce((t, p) => t + perpQty(p) * p.entry, 0) + qty * px(k)) / qtyAfter : px(k);
  const otherNotional = personalReady(chain) ? d.perps.filter((p) => !(p.k === k && p.side === side)).reduce((t, p) => t + perpQty(p) * px(p.k), 0) : 0;
  const effLev = poolAfter > 0 ? (qtyAfter * px(k) + otherNotional) / poolAfter : lev;
  const liq = pooledLiq(side, qtyAfter, entryAfter, poolAfter * ((qtyAfter * px(k)) / Math.max(1e-9, qtyAfter * px(k) + otherNotional)));
  const shows = base > 0;
  const over = c > avail + 1e-9;
  // As the website's order panel: the worst price the order accepts (Max entry for a long, Min entry for a short), the zero-equity
  // price (where this order's own collateral is used up at its leverage, fees aside: mark x (1 -/+ 1/L)), and the margin account
  // before -> after the order (health factor and account leverage; the USDC moves into Phoenix, which counts at 100%, less the fee).
  const limLabel = side === "long" ? "Max entry" : "Min entry";
  const zeroEq = px(k) > 0 ? px(k) * (side === "long" ? 1 - 1 / lev : 1 + 1 / lev) : 0;
  const acctRows = shows && personalReady(chain) && hasMargin(d);
  const before = acctRows ? acct(chain) : null;
  const after = acctRows
    ? simAcct(chain, (x) => {
        mTake(x, "USDC", c);
        x.perps.push({ id: "sim", k, side, lev: effLev, coll: c - fee, entry: px(k), qty, pool: poolAfter, t: "" });
      })
    : null;
  const marginRows: [string, string][] = before && after ? [["Health factor", `${hfFmt(before.hf)} → ${hfFmt(after.hf)}`], ["Account leverage", `${levFmt(before.lev)} → ${levFmt(after.lev)}`]] : [];
  const go = () => {
    // Start the market refresh again now (the one from opening the sheet may be older than the 25 s it is reused for): it runs
    // while the review is read, and the confirm waits for it instead of starting its own.
    prewarmPerps(k, inUseWallet("solana")?.full);
    if (onDone) onDone();
    else closeSheet();
    const openOpts = { market: m.k, side, collateralUsdc: c, leverage: lev, slippageBps: Math.round(slip * 100) };
    const logOpen = (hash?: string) => {
      logPerp(chain, { t: nowT(), a: "Open / increase", k, side, size: sizeUsd, usdc: c, lev, entry: px(k), qty, effLev, pool: poolAfter }, hash);
      ACTIVITY[chain].unshift({ t: nowT(), area: "Perps", action: side === "long" ? "Long" : "Short", detail: `${perpPair(k)} ${levLabel} on Phoenix`, amt: `${nf(c, 2)} USDC`, usd: c, tx: "", sym: k });
    };
    // the sample account only (a real one is read again from the chain after the run)
    const applyOpen = (hash?: string) => {
      mTake(d, "USDC", c);
      d.perps.push({ id: "p" + Date.now(), k, side, lev: effLev, coll: c - fee, entry: px(k), qty, pool: poolAfter, t: nowT() });
      logOpen(hash);
    };
    const returnUsdc = (e: PerpsOpenIncompleteError): TxRecover => ({
      label: "Return USDC to margin",
      done: { title: "Back in your margin account", line: `${nf(e.usdc, 2)} USDC` },
      send: () => (e.where === "phoenix" ? solanaPerpsWithdraw(e.usdc) : solanaPerpsUnwrap()),
    });
    const opened = { title: `${side === "long" ? "Long" : "Short"} ${k} ${levLabel} opened`, line: `${tokFmt(qty, k)} on Phoenix` };
    const real = personalReady(chain);
    const sideW = side === "long" ? "Long" : "Short";
    const usdcT = `${nf(c, 2)} USDC`;
    // The last unfinished open (PerpsOpenIncompleteError): where its USDC waits, so a retry sends only the order with it.
    let lastErr: PerpsOpenIncompleteError | null = null;
    const open = async (r: LegRun, o: typeof openOpts & { sizeOnUsdc?: number }, setup: boolean, add: boolean) => {
      // parts: [set up Phoenix] + the USDC parts (one or two) + the order; the order can carry the deposit in the same transaction
      const map = (i: number, total: number): string | string[] => {
        const base = setup ? 1 : 0;
        if (i < base) return "setup";
        if (i === total - 1) return add && total - base === 1 ? ["add", "order"] : "order";
        return "add";
      };
      try {
        const h = await solanaPerpsOpen({ ...o, control: ctl(r, map) });
        lastErr = null;
        return h;
      } catch (e) {
        if (e instanceof PerpsOpenIncompleteError) lastErr = e;
        throw e;
      }
    };
    setTimeout(async () => {
      // A first trade on Phoenix sets the trading account up in the same approval: that run shows the Phoenix stage.
      const setup = real ? !(await traderRegistered().catch(() => true)) : false;
      const add = c > 0;
      runTx({
        chain, fam, title: `Review ${side} ${perpPair(k)}`, cta: `${sideW} ${k} ${levLabel}`,
        legs: [
          { l: "Collateral", v: usdcT, s: pool0 > 0.01 ? `From your margin account, plus ${nf(pool0, 2)} USDC already in Phoenix` : "From your margin account" },
          { l: "Position", v: `${tokFmt(qty, k)} ${side}`, s: `${usd(sizeUsd)} at ${levLabel} on ${nf(base, 2)} USDC` },
        ],
        rows: [
          ["Entry", "~" + priceFmt(px(k))], [limLabel, priceFmt(maxEntry)], ["Phoenix collateral after", `${nf(poolAfter, 2)} USDC`], ["Position leverage", levTag(effLev)],
          ["Liq. price (est.)", liq ? priceFmt(liq) : "None"], ["Zero-equity price", zeroEq > 0 ? priceFmt(zeroEq) : "None"], ["Taker fee", usd(fee)], ...marginRows,
          ...(setup ? [["First trade on Phoenix", "Account set up in the same approval"] as [string, string]] : []),
        ],
        done: {
          title: opened.title,
          line: setup ? `Phoenix account set up, ${usdcT} moved there as collateral, ${tokFmt(qty, k)} ${side}` : add ? `${usdcT} moved to Phoenix as collateral, ${tokFmt(qty, k)} ${side} on Phoenix` : opened.line,
        },
        plan: [
          ...(setup ? [{ id: "setup", label: "Set up your Phoenix account", noun: "the Phoenix account" }] : []),
          ...(add ? [{ id: "add", label: `Add ${usdcT} to Phoenix`, noun: usdcT }] : []),
          { id: "order", label: `Open ${k} ${side}`, noun: `${k} ${side}` },
        ].map((l, i) => ({ ...l, stage: i })),
        copy: {
          doing: `Opening ${side} ${k} ${levLabel}`,
          part: (ok: Leg[], left: Leg[]): [string, string] => {
            const f = left[0]?.id;
            if (f === "order")
              return lastErr?.where === "margin"
                ? ["Order not placed", `${usdcT} is converted and waits in your margin account. Opening ${k} ${side} didn't go through.`]
                : ["Order not placed", `Your ${usdcT} is in Phoenix. The order did not go through.`];
            if (f === "add") return ["Not confirmed", "Your Phoenix account is ready. Adding USDC didn't go through, so nothing moved."];
            return ["Not confirmed", ok.length ? `${names(left)} didn't go through.` : "Setting up your Phoenix account didn't go through. Nothing moved."];
          },
          stopped: (ok: Leg[]): [string, string] =>
            ok.some((l) => l.id === "add")
              ? lastErr?.where === "phoenix"
                ? ["USDC added, order not placed", `Your ${usdcT} is in Phoenix.`]
                : ["USDC converted, order not placed", `${usdcT} is converted and waits in your margin account.`]
              : ok.length
                ? ["Phoenix account set up, order not placed", "Nothing else was sent."]
                : ["Stopped", "Nothing was sent."],
        },
        cancelable: true,
        stoppable: true,
        phoenix: setup && add ? { market: k, position: `${sideW} ${k} ${levLabel}`, positionLine: `${sideW} ${k} ${levLabel} · ${tokFmt(qty, k)}`, mark: priceFmt(px(k)), usdc: c, margin: avail, phoenix: pool0 } : undefined,
        run: (r) => open(r, openOpts, setup, add),
        // Only what is left: the order with the USDC that already moved (no second deposit), or the add and the order (the account
        // set up already), never a leg that landed.
        retryLegs: (only, r) => {
          const e = lastErr;
          if (only.includes("order") && !only.includes("add") && e) return open(r, e.where === "phoenix" ? { ...openOpts, collateralUsdc: 0, sizeOnUsdc: e.usdc } : openOpts, false, false);
          return open(r, openOpts, only.includes("setup"), only.includes("add"));
        },
        apply: (hash) => (real ? logOpen(hash) : applyOpen(hash)),
        // what the stopped or failed open left in a half-way place: bring the USDC back to the margin account (its own transaction)
        recover: (e) => (e instanceof PerpsOpenIncompleteError ? [returnUsdc(e)] : undefined),
        stopExtra: () => (lastErr ? [returnUsdc(lastErr)] : undefined),
      });
    }, 300);
  };
  return (
    <View style={{ gap: 14, paddingBottom: 4 }}>
      <View style={styles.mark}>
        <TokenLogo sym={k} size={22} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.muted }}>Mark price</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{priceFmt(px(k))}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: m.ch >= 0 ? colors.positive : colors.negative }}>{spct(m.ch)} 24h</Text>
      </View>
      <View style={[styles.ls, { backgroundColor: colors.segment }]}>
        {(["long", "short"] as Side[]).map((s) => (
          <Pressable key={s} onPress={() => setSide(s)} style={[styles.lsI, side === s && { backgroundColor: s === "long" ? "#703AE6" : colors.negative }]} accessibilityRole="tab" accessibilityState={{ selected: side === s }}>
            <Icon name={s === "long" ? "trending_up" : "trending_down"} size={18} color={side === s ? "#FFFFFF" : colors.text} />
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: side === s ? "#FFFFFF" : colors.text }}>{s === "long" ? "Long" : "Short"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.slip}>
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.text }}>Slippage</Text>
        {[0.5, 1, 2].map((s) => (
          <Pressable key={s} onPress={() => setSlip(s)} style={[styles.sc, { backgroundColor: s === slip ? fam.tab : colors.segment }]} accessibilityRole="button" accessibilityState={{ selected: s === slip }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: s === slip ? "#FFFFFF" : colors.text }}>{s}%</Text>
          </Pressable>
        ))}
      </View>
      <AmountField value={amt} onChange={(v) => (setAmt(v), setPct(undefined))} sym="USDC" usdValue={undefined} label="Collateral" bad={over} right={`Available ${nf(avail, 2)}`} />
      <PctChips value={pctV} items={[25, 50, 75, 100]} onPick={(q) => (setPct(q), setAmt(String(Math.floor(avail * q) / 100)))} />
      {pool0 > 0.01 && (
        <View style={[styles.dr, { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.segment }]}>
          <Icon name="info" size={18} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.text }}>
            {useExisting ? `Trading with the ${nf(pool0, 2)} USDC already in your Phoenix account. Nothing is added from margin.` : `${nf(pool0, 2)} USDC is already in your Phoenix account and backs this order too.`}
          </Text>
          <Pressable onPress={() => (setAmt(useExisting ? "" : "0"), setPct(undefined))} accessibilityRole="button" style={[styles.sc, { backgroundColor: useExisting ? fam.tab : colors.surface }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: useExisting ? "#FFFFFF" : colors.text }}>{useExisting ? "Add more" : "Use only this"}</Text>
          </Pressable>
        </View>
      )}
      <Card style={{ backgroundColor: colors.bg }}>
        <LevSlider value={lev} max={m.max} cap={m.max} marks={Array.from({ length: m.max }, (_, i) => i + 1)} onChange={setLev} fam={fam} stepped />
      </Card>
      <View>
        {(
          [
            ["Size", shows ? `${tokFmt(qty, k)} · ${usd(sizeUsd)}` : "—"],
            ["Entry", "~" + priceFmt(px(k))],
            [limLabel, priceFmt(maxEntry)],
            ["Phoenix collateral after", shows ? `${nf(poolAfter, 2)} USDC` : "—"],
            ["Position leverage", shows ? levTag(effLev) : "—"],
            ["Liq. price (est.)", shows ? (liq ? `${priceFmt(liq)} ${pct((liq / px(k) - 1) * 100, 1)}` : "None") : "—"],
            ["Zero-equity price", shows && zeroEq > 0 ? priceFmt(zeroEq) : "—"],
            ["Fee", usd(fee)],
            ...marginRows,
          ] as [string, string][]
        ).map(([l, v], i) => (
          <View key={l} style={[styles.dr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.muted }}>{l}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] }}>{v}</Text>
          </View>
        ))}
      </View>
      <Button
        label={!shows ? "Enter an amount" : over ? "Not enough USDC" : qty <= 0 ? "Size too small" : `${side === "long" ? "Long" : "Short"} ${k} ${levLabel}`}
        fam={side === "long" ? fam : { ...fam, c: ["#FC5457", "#B33C3E"] }}
        disabled={!shows || over || qty <= 0}
        onPress={go}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  car: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  mr: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64 },
  t: { fontFamily: font.semibold, fontSize: 15, fontVariant: ["tabular-nums", "no-contextual"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  mark: { flexDirection: "row", alignItems: "center", gap: 8 },
  ls: { flexDirection: "row", padding: 4, borderRadius: 26, gap: 4 },
  lsI: { flex: 1, height: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  slip: { flexDirection: "row", alignItems: "center", gap: 8 },
  sc: { height: 32, paddingHorizontal: 14, borderRadius: 16, justifyContent: "center" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  oh: { flexDirection: "row", alignItems: "center" },
  ca: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, justifyContent: "center" },
  chips3: { flexDirection: "row", gap: 8 },
  c3: { flex: 1, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hr2: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 8 },
  ic: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tg: { alignSelf: "flex-start", minHeight: 22, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  dr: { flexDirection: "row", alignItems: "center", minHeight: 40 },
});
