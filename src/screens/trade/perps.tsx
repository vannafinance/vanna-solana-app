import { type Href, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { AmountField, LevSlider, PctChips } from "@/components/form";
import { SubTabs, Swap } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, Tag } from "@/components/ui/kit";
import { perpMark } from "@/chain/perp-mark";
import { solanaPerpsClose, solanaPerpsOpen } from "@/chain/solana/actions";
import { nf, pct, sign, spct, sUsd, tokFmt, usd } from "@/format";
import { ACTIVITY, DATA, PERP_HIST, type PerpPos, type Side } from "@/sample/data";
import { liqPriceOf, perpPnl, perpQty } from "@/sample/model";
import { nowT, randTx } from "@/screens/earn/model";
import { openShare } from "@/screens/share/share";
import { useChain } from "@/state/chain";
import { personalReady } from "@/state/personal";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet, openSheet, toast } from "@/ui/overlay";
import { runTx } from "@/ui/tx";

/* Perps on Phoenix (design screens/perps.js, Solana only): Markets | Positions | History | Account; a market page with the candles,
   the position card, order book | trades and Long / Short; the order ticket opens as a sheet over the market. */
export const fam = families.perps;
// fund: hourly funding %, oi and vol in USD, ch: 24 h change %. Live from Phoenix (src/chain/solana/phoenix.ts); mark / oracle are Phoenix's too (perpMark falls back to the oracle PX until the first frame).
export type Mkt = { k: string; pair: string; name: string; max: number; ch: number; fund: number; oi: number; vol: number; mark?: number; oracle?: number };
export const PERP_MKTS: Mkt[] = [
  { k: "SOL", pair: "SOLUSDC", name: "Solana", max: 5, ch: 2.41, fund: 0.0011, oi: 4.82e6, vol: 12.4e6 },
  { k: "ETH", pair: "ETHUSDC", name: "Ethereum", max: 5, ch: -4.59, fund: 0.0008, oi: 6.1e6, vol: 18.9e6 },
  { k: "BTC", pair: "BTCUSDC", name: "Bitcoin", max: 5, ch: 0.62, fund: 0.0005, oi: 9.34e6, vol: 25.1e6 },
  { k: "TSLA", pair: "TSLAUSDC", name: "Tesla", max: 3, ch: 1.18, fund: -0.0003, oi: 0.71e6, vol: 1.3e6 },
  { k: "META", pair: "METAUSDC", name: "Meta", max: 3, ch: -0.44, fund: 0.0002, oi: 0.52e6, vol: 0.9e6 },
];
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
  FUNDING[p.id] ? FUNDING[p.id].reduce((t, d) => t + d[2], 0) : -(p.side === "long" ? 1 : -1) * p.coll * p.lev * ((PERP_MKTS.find((m) => m.k === p.k)?.fund ?? 0) / 100);
export const liqFor = (chain: "solana" | "stellar", p: PerpPos) => liqPriceOf(chain, p.k, p.side) ?? liqOf(p.side, p.entry, p.lev);

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

function Markets() {
  useDataVersion();
  const { colors } = useTheme();
  const { chain } = useChain();
  const open = DATA[chain].perps;
  return (
    <Card style={{ paddingVertical: 4, gap: 0 }}>
      {PERP_MKTS.map((m, i) => {
        const pos = personalReady(chain) ? open.filter((p) => p.k === m.k) : [];
        return (
          <Pressable key={m.k} onPress={() => router.push(`/trade/perp/${m.k}` as Href)} style={[styles.mr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]} accessibilityRole="button" accessibilityLabel={`${m.pair}, ${priceFmt(px(m.k))}, ${spct(m.ch)}`}>
            <TokenLogo sym={m.k} size={36} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.t, { color: colors.text }]}>{m.pair}</Text>
                <Tag label={`${m.max}x`} tone="grey" />
                {pos.map((p) => (
                  <Tag key={p.id} label={p.side === "long" ? "Long" : "Short"} tone={p.side} />
                ))}
              </View>
              <Text style={[styles.cap, { color: colors.muted }]}>Vol {usdC(m.vol)} · OI {usdC(m.oi)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.t, { color: colors.text }]}>{priceFmt(px(m.k))}</Text>
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
            <Tag label={`${p.side === "long" ? "Long" : "Short"} ${Number(p.lev.toFixed(1))}x`} tone={p.side} />
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

export function closePosition(chain: "solana" | "stellar", p: PerpPos) {
  const pnl = perpPnl(p), back = p.coll + pnl - perpQty(p) * px(p.k) * TAKER;
  runTx({
    chain, fam, title: `Close ${perpPair(p.k)}`, cta: "Close position",
    legs: [{ l: "You close", v: `${p.side === "long" ? "Long" : "Short"} ${Number(p.lev.toFixed(1))}x ${p.k}`, s: `${tokFmt(perpQty(p), p.k)} at ${priceFmt(px(p.k))}` }, { l: "Back to your margin account", v: `${nf(Math.max(0, back), 2)} USDC` }],
    rows: [["P&L", sUsd(pnl), pnl >= 0 ? "pos" : "neg"], ["Taker fee", usd(perpQty(p) * px(p.k) * TAKER)]],
    done: { title: `Closed ${perpPair(p.k)}`, line: `${sUsd(pnl)} P&L, ${nf(Math.max(0, back), 2)} USDC back` },
    send: async () => {
      if (chain === "stellar") throw new Error("Stellar perps are not deployed on testnet");
      return await solanaPerpsClose({ market: p.k, side: p.side });
    },
    apply: () => {
      const d = DATA[chain];
      d.perps = d.perps.filter((q) => q.id !== p.id);
      d.margin.avail.USDC = (d.margin.avail.USDC ?? 0) + Math.max(0, back);
      d.realized += pnl;
      PERP_HIST.unshift({ t: nowT(), a: "Close / reduce", k: p.k, side: p.side, size: perpQty(p) * px(p.k), usdc: back, lev: p.lev, pnl });
      ACTIVITY[chain].unshift({ t: nowT(), area: "Perps", action: "Close", detail: `${perpPair(p.k)} ${Number(p.lev.toFixed(1))}x on Phoenix`, amt: `${nf(Math.max(0, back), 2)} USDC`, usd: back, tx: randTx(), sym: p.k });
    },
  });
}

// Close all positions / Withdraw from Phoenix (design px-closeall): the sheet is the review; every position closes at market on
// Phoenix, one transaction each, then everything (with the free collateral) goes back to the margin account.
export function closeAll(chain: "solana" | "stellar") {
  const d = DATA[chain], ps = [...d.perps], idle = d.phoenixIdle;
  const cs = ps.map((p) => {
    const pnl = perpPnl(p), fee = perpQty(p) * px(p.k) * TAKER;
    return { p, pnl, fee, back: p.coll + pnl - fee };
  });
  const fee = cs.reduce((t, c) => t + c.fee, 0), pnl = cs.reduce((t, c) => t + c.pnl - c.fee, 0), back = cs.reduce((t, c) => t + Math.max(0, c.back), 0) + idle;
  const n = ps.length;
  runTx({
    chain, fam, title: n ? "Close all positions" : "Withdraw from Phoenix", cta: n ? "Close all" : "Withdraw to margin",
    legs: [], rows: [],
    body: <CloseAllBody cs={cs} fee={fee} pnl={pnl} idle={idle} back={back} />,
    done: n ? { title: `Closed ${n} position${n === 1 ? "" : "s"}`, line: `${sUsd(pnl)} realized, ${nf(back, 2)} USDC back` } : { title: "Back in your margin account", line: `${nf(back, 2)} USDC from Phoenix` },
    send: async () => {
      if (chain === "stellar") throw new Error("Stellar perps are not deployed on testnet");
      let last = "";
      for (const p of ps) last = await solanaPerpsClose({ market: p.k, side: p.side });
      return last;
    },
    apply: () => {
      const x = DATA[chain];
      cs.forEach((c) => {
        PERP_HIST.unshift({ t: nowT(), a: "Close / reduce", k: c.p.k, side: c.p.side, size: perpQty(c.p) * px(c.p.k), usdc: c.back, lev: c.p.lev, pnl: c.pnl });
        ACTIVITY[chain].unshift({ t: nowT(), area: "Perps", action: "Close", detail: `${perpPair(c.p.k)} ${Number(c.p.lev.toFixed(1))}x on Phoenix`, amt: `${nf(Math.max(0, c.back), 2)} USDC`, usd: c.back, tx: randTx(), sym: c.p.k });
      });
      x.perps = x.perps.filter((q) => !ps.some((p) => p.id === q.id));
      x.margin.avail.USDC = (x.margin.avail.USDC ?? 0) + back;
      x.realized += pnl;
      x.phoenixIdle = 0;
      if (idle > 0.004) PERP_HIST.unshift({ t: nowT(), a: "Deposit to Phoenix", k: "", side: "", size: null, usdc: -idle });
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
        {n ? `${n} ${n === 1 ? "position closes" : "positions close"} at the market price on Phoenix, one transaction each. Then everything goes back to your margin account.` : `No open positions. ${nf(idle, 2)} USDC waits in Phoenix.`}
      </Text>
      {cs.map(({ p, pnl: v }) => (
        <View key={p.id} style={[styles.car, { minHeight: 48 }]}>
          <TokenLogo sym={p.k} size={28} />
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{perpPair(p.k)}</Text>
          <Tag label={`${p.side === "long" ? "Long" : "Short"} ${Number(p.lev.toFixed(1))}x`} tone={p.side} />
          <View style={{ flex: 1 }} />
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
  const { colors } = useTheme();
  const ps = personalReady(chain) ? DATA[chain].perps : [];
  if (!ps.length) return <EmptyCard title="No open positions" module="trade" />;
  return (
    <>
      <View style={styles.oh}>
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: colors.muted }}>{ps.length} open</Text>
        <Pressable onPress={() => closeAll(chain)} style={[styles.ca, { borderColor: colors.borderControl }]} accessibilityRole="button">
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>Close all</Text>
        </Pressable>
      </View>
      {ps.map((p) => (
        <PositionCard key={p.id} p={p} />
      ))}
    </>
  );
}

// History (design): Trades | Funding | Transfers; rows open their numbers in place.
function PerpHistory() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const [k, setK] = useState<"trades" | "funding" | "transfers">("trades");
  const trades = PERP_HIST.filter((h) => h.a === "Open / increase" || h.a === "Close / reduce");
  const transfers = PERP_HIST.filter((h) => h.a === "Deposit to Phoenix" || h.a === "Account setup");
  const funding = DATA[chain].perps.flatMap((p) => (FUNDING[p.id] ?? []).map(([day, n, v]) => ({ p, day, n, v }))).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  return (
    <>
      <View style={styles.chips3}>
        {(
          [
            ["trades", "Trades"],
            ["funding", "Funding"],
            ["transfers", "Transfers"],
          ] as const
        ).map(([key, l]) => (
          <Pressable key={key} onPress={() => setK(key)} style={[styles.c3, { borderColor: k === key ? "transparent" : colors.border, backgroundColor: k === key ? "#1C7C83" : "transparent" }]} accessibilityRole="tab" accessibilityState={{ selected: k === key }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: k === key ? "#FFFFFF" : colors.text }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Swap k={k}>
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          {k === "trades" &&
            trades.map((h, i) => <TradeRow key={i} h={h} first={i === 0} />)}
          {k === "funding" &&
            funding.map((r, i) => (
              <ExpRow
                key={i}
                first={i === 0}
                lead={<TokenLogo sym={r.p.k} size={36} />}
                title={perpPair(r.p.k)}
                sub={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Tag label={r.p.side === "long" ? "Long" : "Short"} tone={r.p.side} />
                    <Text style={[styles.cap, { color: colors.muted }]}>{r.day}</Text>
                  </View>
                }
                value={sUsd(r.v)}
                tone={sign(r.v)}
                detail={[["Payments", String(r.n)], ["Rate", `${nf(PERP_MKTS.find((m) => m.k === r.p.k)?.fund ?? 0, 4)}% / 1h`], [r.v < 0 ? "Paid" : "Received", usd(Math.abs(r.v))]]}
              />
            ))}
          {k === "transfers" &&
            transfers.map((h, i) => (
              <View key={i} style={[styles.hr2, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                <View style={[styles.ic, { backgroundColor: colors.segment }]}>
                  <Icon name={h.a === "Account setup" ? "person" : "south"} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.t, { color: colors.text }]}>{h.a === "Account setup" ? "Account opened" : "To Phoenix"}</Text>
                  <Text style={[styles.cap, { color: colors.muted }]}>{h.t}</Text>
                </View>
                <Text style={[styles.t, { color: colors.text }]}>{h.usdc != null ? nf(h.usdc, 2) : "—"}</Text>
                <IconAction icon="open_in_new" label="View on explorer" tone="plain" onPress={() => toast("Opens the explorer")} />
              </View>
            ))}
        </Card>
      </Swap>
    </>
  );
}

function TradeRow({ h, first }: { h: (typeof PERP_HIST)[number]; first: boolean }) {
  const open = h.a === "Open / increase";
  const label = `${open ? "Open" : "Close"} ${h.side} ${h.lev ?? ""}x`.replace(/\s+x$/, "");
  return (
    <ExpRow
      first={first}
      lead={<TokenLogo sym={h.k} size={36} />}
      title={perpPair(h.k)}
      sub={
        <View style={{ gap: 4 }}>
          <View style={[styles.tg, { backgroundColor: h.side === "short" ? "#6B0F1A" : "#3B2484" }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: h.side === "short" ? "#FFB3B5" : "#E1D5FA" }}>{label}</Text>
          </View>
        </View>
      }
      time={h.t}
      value={open ? usd(h.size ?? 0) : sUsd(h.pnl ?? 0)}
      tone={open ? "" : sign(h.pnl ?? 0)}
      detail={[["Size", usd(h.size ?? 0)], ["Entry", priceFmt(h.k === "BTC" ? 82840 : h.k === "SOL" ? 114.2 : 2492.4)], ["Leverage", `${h.lev ?? 1}x`], ["Fees", usd((h.size ?? 0) * TAKER)], ["Funding", h.k === "BTC" ? "+$0.45" : h.k === "SOL" ? "−$3.02" : "−$0.22"]]}
    />
  );
}

function ExpRow({ lead, title, sub, time, value, tone, detail, first }: { lead: React.ReactNode; title: string; sub: React.ReactNode; time?: string; value: string; tone?: string; detail: [string, string][]; first: boolean }) {
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
          <Pairs n={3} items={detail.map(([l, v]) => ({ label: l, value: v, tone: v.startsWith("+") ? "pos" : v.startsWith("−") ? "neg" : "" }))} />
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
  const [slip, setSlip] = useState(1);
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  const [lev, setLev] = useState(Math.min(3, m.max));
  const levLabel = `${Number(lev.toFixed(1))}x`;
  const avail = d.margin.avail.USDC ?? 0;
  const c = parseFloat(amt) || 0, notional = c * lev, qty = notional / px(k), fee = notional * TAKER;
  const maxEntry = px(k) * (side === "long" ? 1 + slip / 100 : 1 - slip / 100);
  const liq = liqOf(side, px(k), lev);
  const over = c > avail + 1e-9;
  const go = () => {
    if (onDone) onDone();
    else closeSheet();
    setTimeout(
      () =>
        runTx({
          chain, fam, title: `Review ${side} ${perpPair(k)}`, cta: `${side === "long" ? "Long" : "Short"} ${k} ${levLabel}`,
          legs: [{ l: "Collateral", v: `${nf(c, 2)} USDC`, s: "From your margin account" }, { l: "Position", v: `${tokFmt(qty, k)} ${side}`, s: `${usd(notional)} at ${levLabel}` }],
          rows: [["Entry", "~" + priceFmt(px(k))], ["Liq. price", priceFmt(liq)], ["Fee", usd(fee)]],
          done: { title: `${side === "long" ? "Long" : "Short"} ${k} ${levLabel} opened`, line: `${tokFmt(qty, k)} on Phoenix` },
          send: async () => {
            if (chain === "stellar") throw new Error("Stellar perps are not deployed on testnet");
            return await solanaPerpsOpen({
              market: m.k,
              side,
              collateralUsdc: c,
              leverage: lev,
              slippageBps: Math.round(slip * 100),
            });
          },
          apply: () => {
            d.margin.avail.USDC = Math.max(0, avail - c);
            d.perps.push({ id: "p" + Date.now(), k, side, lev, coll: c - fee, entry: px(k), t: nowT() });
            PERP_HIST.unshift({ t: nowT(), a: "Open / increase", k, side, size: notional, usdc: c, lev });
            ACTIVITY[chain].unshift({ t: nowT(), area: "Perps", action: side === "long" ? "Long" : "Short", detail: `${perpPair(k)} ${levLabel} on Phoenix`, amt: `${nf(c, 2)} USDC`, usd: c, tx: randTx(), sym: k });
          },
        }),
      300,
    );
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
      <Card style={{ backgroundColor: colors.bg }}>
        <LevSlider value={lev} max={m.max} cap={m.max} marks={Array.from({ length: m.max }, (_, i) => i + 1)} onChange={setLev} fam={fam} stepped />
      </Card>
      <View>
        {(
          [
            ["Size", c > 0 ? `${tokFmt(qty, k)} · ${usd(notional)}` : "—"],
            ["Entry", "~" + priceFmt(px(k))],
            ["Max entry", priceFmt(maxEntry)],
            ["Liq. price", c > 0 ? `${priceFmt(liq)} ${pct(((liq / px(k)) - 1) * 100, 1)}` : "—"],
            ["Fee", usd(fee)],
          ] as [string, string][]
        ).map(([l, v], i) => (
          <View key={l} style={[styles.dr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.muted }}>{l}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] }}>{v}</Text>
          </View>
        ))}
      </View>
      <Button
        label={!(c > 0) ? "Enter an amount" : over ? "Not enough USDC" : `${side === "long" ? "Long" : "Short"} ${k} ${levLabel}`}
        fam={side === "long" ? fam : { ...fam, c: ["#FC5457", "#B33C3E"] }}
        disabled={!(c > 0) || over}
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
