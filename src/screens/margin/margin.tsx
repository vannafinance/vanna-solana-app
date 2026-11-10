import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { Chart, curve } from "@/components/chart";
import { AmountField, Eyebrow, hfTone, InfoTip, LevSlider, Note, PctChips, Preview, Seg2 } from "@/components/form";
import { HistoryList } from "@/components/history";
import { SubTabs, Swap } from "@/components/motion";
import { VannaMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard } from "@/components/ui/kit";
import { hfFmt, levFmt, nf, pct, sUsd, tokFmt, usd } from "@/format";
import { MascotFace } from "@/mascot/mascot";
import { ACTIVITY, type ChainData, DATA, POOLS_BY } from "@/sample/data";
import {
  acct, bisect, portfolioTotals, hasMargin, LEV_CAP, LIQ_HF, lossBuffer, mAddColl, mAddDebt, mAddIdle, mbal, mPayDebt, mTake, priceOf, priceRoom, SAFE_HF, simAcct, WARN_HF,
} from "@/sample/model";
import { nowT, randTx } from "@/screens/earn/model";
import { AccountMap } from "@/screens/portfolio/trader";
import type { Chain } from "@/state/chain";
import { useChain } from "@/state/chain";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { openSheet } from "@/ui/overlay";
import { runTx } from "@/ui/tx";
import {
  stellarBorrow,
  stellarDepositAndBorrow,
  stellarDepositCollateral,
  stellarRepay,
  stellarWithdrawCollateral,
} from "@/chain/stellar/actions";
import {
  solanaDepositAndBorrow,
  solanaDepositMarginCollateral,
  solanaRepay,
  solanaWithdrawMarginCollateral,
} from "@/chain/solana/actions";

/* Margin (design screens/margin.js, V4: one page): hero, Leverage | Repay | Transfer in the pill, the "Your account" row (Account |
   History in a sheet), then the action's form card. Every action previews health factor before → after on a simulated account. */
export type MarginAct = "leverage" | "repay" | "transfer";
const fam = families.margin;

const DEP: Record<Chain, string[]> = { solana: ["SOL", "USDC", "JitoSOL", "JupSOL", "JupUSD"], stellar: ["XLM", "BLUSDC", "AqUSDC", "SoUSDC"] };
// design margin.js TIPS
const TIPS = {
  lev: "Account leverage: market exposure (volatile collateral, spot positions and perp size) divided by equity.",
  src: "Wallet deposits from your wallet. Margin borrows against collateral already in your account.",
};
const rateOf = (chain: Chain, s: string) => POOLS_BY[chain].find((p) => p.sym === s)?.borA;
const num = (t: string) => parseFloat(t) || 0;
const fmtIn = (v: number, s: string) => (v > 0 ? String(Math.floor(v * (priceOf(s) > 50 ? 1e4 : 100)) / (priceOf(s) > 50 ? 1e4 : 100)) : "");

function logM(chain: Chain, action: string, detail: string, sym: string, amt: number, usdV: number) {
  ACTIVITY[chain].unshift({ t: nowT(), area: "Margin", action, detail, amt: tokFmt(amt, sym), usd: usdV, tx: randTx(), sym });
}

export function MarginHeroBody() {
  const { chain } = useChain();
  const d = DATA[chain];
  if (!hasMargin(d)) return null;
  const a = acct(chain);
  const nd = !(a.debtUsd > 0.005);
  const r = priceRoom(chain);
  const room = r.state === "ok" ? `${(r.pct ?? 0) < 0 ? "−" : "+"}${nf(Math.abs(r.pct ?? 0), 1)}%` : r.state === "now" ? "Liquidatable now" : "—";
  return (
    <View style={styles.hstats}>
      <View style={[styles.hst, { flexDirection: "row", alignItems: "flex-start", gap: 8 }]}>
        {!nd && <MascotFace hf={a.hf} size={40} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.hl}>Health factor</Text>
          <Text style={[styles.hv, nd && { color: "#32EEE2" }]}>{nd ? "No debt" : hfFmt(a.hf)}</Text>
          <Text style={styles.hs}>Liquidation at {nf(LIQ_HF, 2)}</Text>
        </View>
      </View>
      <View style={[styles.hst, styles.sep]}>
        <Text style={styles.hl}>Room before liquidation</Text>
        <Text style={styles.hv}>{room}</Text>
        <Text style={styles.hs} numberOfLines={1}>{r.state === "nodebt" ? "Nothing to liquidate" : "all collateral prices together"}</Text>
      </View>
    </View>
  );
}

export function MarginChips() {
  const { chain } = useChain();
  if (!hasMargin(DATA[chain])) return null;
  const a = acct(chain);
  return (
    <View style={styles.chips}>
      <View style={styles.chip}>
        <Text style={styles.chipT}>Borrowed {usd(a.debtUsd)}</Text>
      </View>
      <View style={styles.chip}>
        <Text style={styles.chipT}>Leverage {levFmt(a.lev)}</Text>
      </View>
    </View>
  );
}

// "Your account" row: collateral, borrowed, loans; opens Account | History in a sheet (design V6 U1).
function AccountRow({ onRepay }: { onRepay: (sym: string) => void }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const a = acct(chain);
  const loans = d.margin.debt.filter((x) => x.amt > 0).length;
  return (
    <Pressable onPress={() => openSheet({ title: "Your account", detents: true, content: (close) => <AccountSheet onRepay={(s) => (close(), onRepay(s))} /> })} accessibilityRole="button" accessibilityLabel="Your account, open">
      <Card style={styles.acRow}>
        {[
          ["Collateral", usd(a.collUsd)],
          ["Borrowed", usd(a.debtUsd)],
          ["Loans", String(loans)],
        ].map(([l, v], i) => (
          <View key={l} style={[{ flex: 1, alignItems: "center" }, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.divider }]}>
            <Text style={[styles.cap, { color: colors.muted }]}>{l}</Text>
            <Text style={[styles.v, { color: colors.text }]}>{v}</Text>
          </View>
        ))}
        <Icon name="expand_less" size={22} color="muted" />
      </Card>
    </Pressable>
  );
}

function AccountSheet({ onRepay }: { onRepay: (sym: string) => void }) {
  const { chain } = useChain();
  const [t, setT] = useState<"acct" | "hist">("acct");
  return (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      <SubTabs items={[["acct", "Account"], ["hist", "History"]]} value={t} onChange={setT} fam={fam} />
      <Swap k={t}>{t === "acct" ? <AccountMap inSheet onRepay={onRepay} /> : <MarginHistory />}</Swap>
    </View>
  );
}

// History (design acctmap history): the account's Net P&L or health factor over time, then every margin action.
function MarginHistory() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const [mode, setMode] = useState<"pnl" | "hf">("pnl");
  const [range, setRange] = useState<"1W" | "1M" | "3M" | "All">("1M");
  const a = acct(chain);
  const net = portfolioTotals(chain).earnTrade - d.margin.interestPaid;
  const since = (d.margin.created ?? "").split(",")[0];
  const n = range === "1W" ? 28 : range === "1M" ? 31 : range === "3M" ? 46 : 52;
  const pts = mode === "pnl" ? curve(net, 4, n, Math.round(n * 0.4)).map((v, i) => (i < n * 0.85 ? -Math.abs(net) * 0.12 + v * 0.2 : v)) : Array.from({ length: n }, (_, i) => a.hf + 0.35 * (1 - i / (n - 1)) + 0.05 * Math.sin(i * 1.4));
  const x = range === "1W" ? ["Sep 30", "Oct 3", "Oct 7"] : [since, "Sep 28", "Oct 7"];
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 18, color: colors.text }}>Margin</Text>
          <InfoTip text="Net P&L: trading earnings less interest paid, since the account opened. Health factor: how it moved over the range." />
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 24, color: mode === "pnl" ? (net >= 0 ? colors.positive : colors.negative) : colors.text, fontVariant: ["tabular-nums"] }}>
            {mode === "pnl" ? sUsd(net) : hfFmt(a.hf)}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted }}>{mode === "pnl" ? `since ${since}` : "now"}</Text>
        </View>
        <Seg2 items={[["pnl", "Net P&L"], ["hf", "Health factor"]]} value={mode} onChange={setMode} label="Chart" full />
        <Seg2 items={[["1W", "1W"], ["1M", "1M"], ["3M", "3M"], ["All", "All"]]} value={range} onChange={setRange} label="Range" full />
        <Swap k={mode + range}>
          <Chart pts={pts} color={colors.link} height={140} zero={mode === "pnl"} x={x} label={mode === "pnl" ? "Net P&L" : "Health factor"} />
        </Swap>
      </Card>
      <HistoryList rows={ACTIVITY[chain].filter((r) => r.area === "Margin")} module="margin" />
    </View>
  );
}

export function MarginBody({ act, setAct }: { act: MarginAct; setAct: (a: MarginAct) => void }) {
  const [repaySym, setRepaySym] = useState<string | undefined>();
  const { chain } = useChain();
  return (
    <View style={{ gap: 12 }}>
      {hasMargin(DATA[chain]) && <AccountRow onRepay={(s) => (setRepaySym(s), setAct("repay"))} />}
      <Swap k={act}>
        <Card style={{ gap: 16 }}>{act === "leverage" ? <Leverage /> : act === "repay" ? <Repay initial={repaySym} /> : <MarginTransfer />}</Card>
      </Swap>
    </View>
  );
}

/* ---------------- Leverage: deposit (wallet or account collateral), borrow, leverage ---------------- */
function Leverage() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const [src, setSrc] = useState<"wb" | "mb">("wb");
  const [rows, setRows] = useState<{ id: number; sym: string; amt: string; pct?: number }[]>([{ id: 1, sym: DEP[chain][0], amt: "" }]);
  const borList = POOLS_BY[chain].map((p) => p.sym);
  const [dual, setDual] = useState(false);
  const [bTok, setBTok] = useState<string[]>(chain === "solana" ? ["USDC", "SOL"] : ["SoUSDC", "XLM"]);
  const [lev, setLev] = useState(2);
  const [bAmt, setBAmt] = useState<(string | null)[]>([null, null]); // null = follows leverage

  const depList = src === "mb" ? DEP[chain].filter((t) => mbal(d, t) > 0) : DEP[chain];
  const balOf = (t: string) => (src === "mb" ? mbal(d, t) : d.wallet[t] ?? 0);
  const deps = rows.map((r) => ({ ...r, sym: depList.includes(r.sym) ? r.sym : depList[0] ?? DEP[chain][0], x: num(r.amt) }));
  const depUsd = deps.reduce((t, r) => t + r.x * priceOf(r.sym), 0);
  const overBal = deps.some((r) => r.x > balOf(r.sym) + 1e-9);
  const n = dual ? 2 : 1;
  const toks = bTok.slice(0, n).map((t) => (borList.includes(t) ? t : borList[0]));
  const dup = n === 2 && toks[0] === toks[1];
  const applyDep = (c: ChainData) => {
    if (src === "wb") deps.forEach((r) => r.x > 0 && mAddColl(c, r.sym, r.x));
  };
  const borrowAll = (c: ChainData, usdTotal: number) =>
    toks.forEach((t) => {
      const v = usdTotal / n / priceOf(t);
      mAddDebt(c, t, v);
      mAddIdle(c, t, v);
    });
  const accMax = depUsd > 0 ? bisect((B) => simAcct(chain, (c) => (applyDep(c), borrowAll(c, B))).hf >= SAFE_HF, depUsd * (LEV_CAP - 1)) : 0;
  // design FRESH_MAX: the safe ceiling shown before any deposit
  const max = depUsd > 0 ? Math.max(1, Math.min(LEV_CAP, Math.floor((1 + accMax / depUsd) * 100) / 100)) : 7.66;
  const L = Math.min(lev, max);
  const limitUsd = depUsd * (L - 1);
  const items = toks.map((t, i) => {
    const auto = limitUsd / n / priceOf(t);
    const amt = bAmt[i] == null ? auto : num(bAmt[i]!);
    return { sym: t, amt, usd: amt * priceOf(t), text: bAmt[i] ?? fmtIn(auto, t) };
  });
  const totalUsd = items.reduce((t, x) => t + x.usd, 0);
  const over = totalUsd > limitUsd + 0.01 || (depUsd > 0 && totalUsd > accMax + 0.01);
  const before = acct(chain);
  const any = depUsd > 0 || totalUsd > 0;
  const after = any ? simAcct(chain, (c) => (applyDep(c), items.forEach((x) => x.amt > 0 && (mAddDebt(c, x.sym, x.amt), mAddIdle(c, x.sym, x.amt))))) : null;
  const err = totalUsd > 0 && depUsd <= 0 ? "Add collateral before borrowing." : dup ? "Pick two different assets to borrow." : over && totalUsd > 0 ? `Total ${usd(totalUsd)} is over your limit of ${usd(Math.min(limitUsd, accMax || limitUsd))}. Lower an amount or raise leverage.` : null;
  const label = !any ? "Enter an amount" : overBal ? "Not enough balance" : src === "mb" ? "Borrow" : L <= 1 + 1e-9 || !(totalUsd > 0) ? "Deposit" : "Deposit and borrow";
  const setRow = (id: number, p: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const resetB = () => setBAmt([null, null]);

  const go = () => {
    const dl: [string, number][] = src === "wb" ? deps.filter((r) => r.x > 0).map((r) => [r.sym, r.x]) : [];
    const borrows = L > 1 ? items.filter((x) => x.amt > 0) : [];
    const a = after!;
    runTx({
      chain, fam,
      title: borrows.length ? (dl.length ? "Review deposit and borrow" : "Review borrow") : "Review deposit",
      cta: borrows.length ? (dl.length ? "Deposit and borrow" : "Borrow") : "Deposit",
      legs: [
        ...(dl.length ? [{ l: "You deposit", v: dl.map(([t, v]) => tokFmt(v, t)).join(" + "), s: "From your wallet" }] : []),
        ...(borrows.length ? [{ l: "You borrow", v: borrows.map((x) => tokFmt(x.amt, x.sym)).join(" + "), s: borrows.map((x) => `${x.sym} ${pct(rateOf(chain, x.sym) ?? 0)} APY`).join(", ") }] : []),
      ],
      rows: [
        ["Health factor", `${hfFmt(before.hf)} → ${hfFmt(a.hf)}`],
        ["Account leverage", `${levFmt(before.lev)} → ${levFmt(a.lev)}`],
      ],
      done: { title: borrows.length ? "Borrowed into your account" : "Collateral added", line: [...dl.map(([t, v]) => "Deposited " + tokFmt(v, t)), ...borrows.map((x) => "borrowed " + tokFmt(x.amt, x.sym))].join(", ") },
      send: async () => {
        if (chain === "stellar") {
          if (dl.length === 1 && borrows.length === 1) {
            return await stellarDepositAndBorrow({
              depositSym: dl[0][0],
              depositAmount: dl[0][1],
              collateralSym: dl[0][0],
              collateralAmount: dl[0][1],
              borrowSym: borrows[0].sym,
              borrowAmount: borrows[0].amt,
            } as any);
          }
          let lastHash = "";
          for (const [sym, amt] of dl) lastHash = await stellarDepositCollateral(sym, amt);
          for (const b of borrows) lastHash = await stellarBorrow(b.sym, b.amt);
          return lastHash;
        }
        return await solanaDepositAndBorrow({
          deposits: dl.map(([sym, amount]) => ({ sym, amount })),
          borrows: borrows.map((b) => ({ sym: b.sym, amount: b.amt })),
        });
      },
      apply: () => {
        if (!d.margin.created) d.margin.created = nowT();
        dl.forEach(([t, v]) => {
          d.wallet[t] = Math.max(0, (d.wallet[t] ?? 0) - v);
          mAddColl(d, t, v);
          logM(chain, "Deposit", `${t} collateral`, t, v, v * priceOf(t));
        });
        borrows.forEach((x) => {
          mAddDebt(d, x.sym, x.amt);
          mAddIdle(d, x.sym, x.amt);
          logM(chain, "Borrow", x.sym, x.sym, x.amt, x.usd);
        });
        setRows([{ id: 1, sym: DEP[chain][0], amt: "" }]);
        resetB();
      },
    });
  };

  return (
    <>
      <Eyebrow tip={TIPS.src} right={<Seg2 items={[["wb", "Wallet"], ["mb", "Margin"]]} value={src} onChange={(k) => (setSrc(k), setRows([{ id: 1, sym: (k === "mb" ? DEP[chain].find((t) => mbal(d, t) > 0) : DEP[chain][0]) ?? DEP[chain][0], amt: "" }]), resetB())} label="Deposit from" />}>
        Deposit
      </Eyebrow>
      {deps.map((r, i) => (
        <View key={r.id} style={{ gap: 8 }}>
          {i > 0 && (
            <View style={styles.rh}>
              <Text style={[styles.eb2, { color: colors.muted }]}>COLLATERAL {i + 1}</Text>
              <Pressable onPress={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove this collateral">
                <Icon name="close" size={20} color="muted" />
              </Pressable>
            </View>
          )}
          <AmountField
            value={r.amt}
            onChange={(v) => (setRow(r.id, { amt: v, pct: undefined }), resetB())}
            sym={r.sym}
            onSym={(t) => setRow(r.id, { sym: t, amt: "" })}
            syms={depList}
            meta={(t) => nf(balOf(t), 2)}
            usdValue={r.x * priceOf(r.sym)}
            label="Collateral amount"
            bad={r.x > balOf(r.sym) + 1e-9}
            footer={
              <View style={styles.ff}>
                <Text style={[styles.cap, { color: colors.muted, flex: 1 }]}>
                  {src === "mb" ? "In your account" : "Wallet"} {tokFmt(balOf(r.sym), r.sym)}
                </Text>
                <PctChips small value={r.pct} onPick={(p) => (setRow(r.id, { pct: p, amt: fmtIn((balOf(r.sym) * p) / 100, r.sym) }), resetB())} />
              </View>
            }
          />
        </View>
      ))}
      {src === "wb" && (
        <Pressable
          onPress={() => setRows((rs) => [...rs, { id: Date.now(), sym: DEP[chain].find((t) => !rs.some((x) => x.sym === t)) ?? DEP[chain][0], amt: "" }])}
          disabled={rows.length >= 3}
          style={[styles.addc, { borderColor: colors.borderControl, opacity: rows.length >= 3 ? 0.4 : 1 }]}
          accessibilityRole="button"
        >
          <Icon name="add" size={18} />
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>Add collateral</Text>
        </Pressable>
      )}
      <View style={[styles.hr, { backgroundColor: colors.divider }]} />
      <Eyebrow
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.text }}>Dual borrow</Text>
            <Switch value={dual} onValueChange={(v) => (setDual(v), resetB())} trackColor={{ true: fam.n[0], false: colors.disabled }} thumbColor="#FFFFFF" accessibilityLabel="Dual borrow" />
          </View>
        }
      >
        Borrow
      </Eyebrow>
      {items.map((x, i) => (
        <AmountField
          key={i}
          value={x.text}
          onChange={(v) => setBAmt((b) => b.map((y, j) => (j === i ? v : y)))}
          sym={x.sym}
          onSym={(t) => (setBTok((b) => b.map((y, j) => (j === i ? t : y))), resetB())}
          syms={borList}
          meta={(t) => `${pct(rateOf(chain, t) ?? 0)} APY`}
          usdValue={x.usd}
          label="Borrow amount"
          bad={over && x.usd > 0}
          right={`${pct(rateOf(chain, x.sym) ?? 0)} APY`}
        />
      ))}
      {(totalUsd > 0 || limitUsd > 0) && (
        <View style={styles.ff}>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: over ? colors.negative : colors.text }}>Total {usd(totalUsd)}</Text>
          <Text style={[styles.cap, { color: colors.muted }]}>Limit {usd(limitUsd)}</Text>
        </View>
      )}
      {err && <Note text={err} />}
      <View style={[styles.hr, { backgroundColor: colors.divider }]} />
      <LevSlider value={L} max={max} onChange={(v) => (setLev(v), resetB())} tip={TIPS.lev} />
      {after && (
        <Preview
          rows={[
            ["Health factor", hfFmt(before.hf), hfFmt(after.hf), hfTone(after.hf)],
            ["Leverage", levFmt(before.lev), levFmt(after.lev)],
            ...(totalUsd > 0 ? [["Borrowed", usd(before.debtUsd), usd(after.debtUsd)] as [string, string, string]] : []),
          ]}
        />
      )}
      {after && after.hf >= SAFE_HF && after.hf < WARN_HF && totalUsd > 0 && <Note text={`Health factor ${hfFmt(after.hf)} after this. Close to liquidation at 1.10.`} />}
      <Button label={label} fam={fam} disabled={!any || overBal || (L > 1 && !!err)} onPress={go} />
    </>
  );
}

/* ---------------- Repay ---------------- */
function Repay({ initial }: { initial?: string }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const debts = d.margin.debt.filter((x) => x.amt > 0);
  const [sym, setSym] = useState(initial ?? debts[0]?.sym ?? "");
  const [src, setSrc] = useState<"wallet" | "margin">("wallet");
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  if (!debts.length) return <EmptyCard title="No loans to repay" module="margin" />;
  const s = debts.some((x) => x.sym === sym) ? sym : debts[0].sym;
  const debt = debts.find((x) => x.sym === s)!.amt;
  const avail = src === "margin" ? mbal(d, s) : d.wallet[s] ?? 0;
  const x = Math.min(num(amt), debt);
  const short = avail + 1e-9 < x;
  const before = acct(chain);
  const repApply = (c: ChainData) => {
    if (src === "margin") mTake(c, s, x);
    else c.wallet[s] = (c.wallet[s] ?? 0) - x;
    mPayDebt(c, s, x);
  };
  const after = x > 0 && !short ? simAcct(chain, repApply) : null;
  const go = () =>
    runTx({
      chain, fam, title: "Review repay", cta: "Repay",
      legs: [{ l: "You repay", v: tokFmt(x, s), s: src === "margin" ? "From your account" : "From your wallet" }],
      rows: [["Loan left", tokFmt(Math.max(0, debt - x), s)], ["Health factor", `${hfFmt(before.hf)} → ${hfFmt(after!.hf)}`]],
      done: { title: "Loan repaid", line: `${tokFmt(x, s)} repaid` },
      send: async () => {
        if (chain === "stellar") {
          if (src === "wallet") {
            await stellarDepositCollateral(s, x);
          }
          return await stellarRepay(s, x, pctV === 100);
        }
        return await solanaRepay({
          sym: s,
          amount: x,
          all: pctV === 100,
          source: src,
        });
      },
      apply: () => {
        repApply(d);
        logM(chain, "Repay", `${s} loan`, s, x, -x * priceOf(s));
        setAmt("");
        setPct(undefined);
      },
    });
  return (
    <>
      <View style={[styles.strip, { backgroundColor: colors.bg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cap, { color: colors.muted }]}>You owe</Text>
          <Text style={[styles.v, { color: colors.text }]}>{tokFmt(debt, s)}</Text>
          <Text style={[styles.cap, { color: colors.muted }]}>~ {usd(debt * priceOf(s))}</Text>
        </View>
        <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colors.divider, paddingLeft: 12 }}>
          <Text style={[styles.cap, { color: colors.muted }]}>{src === "margin" ? "In your account" : "In your wallet"}</Text>
          <Text style={[styles.v, { color: colors.text }]}>{tokFmt(avail, s)}</Text>
          <Text style={[styles.cap, { color: colors.muted }]}>~ {usd(avail * priceOf(s))}</Text>
        </View>
      </View>
      <Eyebrow right={<Seg2 items={[["wallet", "Wallet"], ["margin", "Margin"]]} value={src} onChange={setSrc} label="Repay from" />}>From</Eyebrow>
      <AmountField value={amt} onChange={(v) => (setAmt(v), setPct(undefined))} sym={s} onSym={(t) => (setSym(t), setAmt(""))} syms={debts.map((x) => x.sym)} meta={(t) => "owe " + tokFmt(debts.find((y) => y.sym === t)?.amt ?? 0, t)} usdValue={x * priceOf(s)} label="Repay amount" bad={short} />
      <PctChips value={pctV} items={[25, 50, 75, 100]} onPick={(p) => (setPct(p), setAmt(fmtIn((debt * p) / 100, s)))} />
      {short && x > 0 && <Note text={`Your ${src === "margin" ? "account" : "wallet"} holds ${tokFmt(avail, s)}, less than ${tokFmt(x, s)}.`} />}
      {after && <Preview rows={[["Health factor", hfFmt(before.hf), hfFmt(after.hf), hfTone(after.hf)], ["Borrowed", usd(before.debtUsd), usd(after.debtUsd)]]} />}
      <Button label={x > 0 && short ? "Not enough balance" : x > 0 ? `Repay ${tokFmt(x, s)}` : "Enter an amount"} fam={fam} disabled={!(x > 0) || short} onPress={go} />
    </>
  );
}

/* ---------------- Transfer: wallet ↔ margin account ---------------- */
// Transfer sheet pieces: one side of the From / To card, and a before → after row.
function TSide({ label, sub, amount, wallet }: { label: string; sub: string; amount: string; wallet: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.side}>
      <View style={[styles.si, { backgroundColor: wallet ? colors.purpleTint : colors.surface }]}>
        {wallet ? <Icon name="account_balance_wallet" size={20} color={colors.onPurpleTint} /> : <VannaMark size={22} tone="lift" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cap, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.v, { color: colors.text }]}>{sub}</Text>
      </View>
      <Text style={[styles.v, { color: colors.text }]}>{amount}</Text>
    </View>
  );
}
function TRow({ l, a, b, tone, first, show }: { l: string; a: string; b: string; tone?: string; first?: boolean; show: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.dr, !first && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
      <Text style={[styles.cap, { flex: 1, color: colors.muted, fontSize: 14 }]}>{l}</Text>
      {show && a !== b && (
        <>
          <Text style={[styles.cap, { color: colors.muted, fontSize: 14 }]}>{a}</Text>
          <Icon name="arrow_forward" size={14} color="muted" />
        </>
      )}
      <Text style={[styles.v, { fontSize: 14, color: tone === "neg" ? colors.negative : tone === "warn" ? colors.warning : tone === "pos" ? colors.positive : colors.text }]}>{show ? b : a}</Text>
    </View>
  );
}

export function MarginTransfer({ sheet }: { sheet?: boolean } = {}) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const [dir, setDir] = useState<"MB" | "WB">("MB");
  const [sym, setSym] = useState(DEP[chain][0]);
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  const list = dir === "MB" ? DEP[chain] : [...new Set([...d.margin.coll.map((c) => c.sym), ...Object.keys(d.margin.avail).filter((k) => (d.margin.avail[k] ?? 0) > 0)])];
  const s = list.includes(sym) ? sym : list[0] ?? DEP[chain][0];
  const maxT = dir === "MB" ? d.wallet[s] ?? 0 : mbal(d, s);
  const x = num(amt);
  const before = acct(chain);
  const debt = before.debtUsd > 0.005;
  const trApply = (c: ChainData, v: number) => {
    if (dir === "MB") {
      c.wallet[s] = (c.wallet[s] ?? 0) - v;
      mAddColl(c, s, v);
    } else {
      mTake(c, s, v);
      c.wallet[s] = (c.wallet[s] ?? 0) + v;
    }
  };
  const maxW = dir === "WB" && debt ? bisect((v) => simAcct(chain, (c) => trApply(c, v)).hf >= SAFE_HF, maxT) : maxT;
  const over = x > maxT + 1e-9;
  const after = x > 0 && !over ? simAcct(chain, (c) => trApply(c, x)) : null;
  const belowSafe = dir === "WB" && debt && after != null && after.hf < SAFE_HF;
  const buf = (a: { hf: number; weighted: number; debtUsd: number; maint: number }) => (isFinite(a.hf) && a.debtUsd > 0.005 ? usd(Math.max(0, a.weighted - LIQ_HF * (a.debtUsd + a.maint)), 0) : "No debt");
  const go = () =>
    runTx({
      chain, fam, title: "Review transfer", cta: "Move",
      legs: [{ l: "You move", v: tokFmt(x, s), s: dir === "MB" ? "Wallet to margin account" : "Margin account to wallet" }],
      rows: [["Health factor", `${hfFmt(before.hf)} → ${hfFmt(after!.hf)}`], ["Loss buffer", `${usd(lossBuffer(chain))} → —`]],
      done: { title: dir === "MB" ? "Moved to your account" : "Moved to your wallet", line: tokFmt(x, s) },
      send: async () => {
        if (chain === "stellar") {
          return dir === "MB"
            ? await stellarDepositCollateral(s, x)
            : await stellarWithdrawCollateral(s, x);
        }
        return dir === "MB"
          ? await solanaDepositMarginCollateral(s, x)
          : await solanaWithdrawMarginCollateral(s, x);
      },
      apply: () => {
        trApply(d, x);
        logM(chain, dir === "MB" ? "Deposit" : "Withdraw", dir === "MB" ? `${s} collateral` : `${s} to wallet`, s, x, x * priceOf(s));
        setAmt("");
        setPct(undefined);
      },
    });
  if (sheet) {
    // Quick transfer sheet (design SCREENS.transfer): a From / To card with a flip button, the amount card with 25% 50% Max, and a details card.
    const toM = dir === "MB";
    const open = hasMargin(d);
    const wSide = <TSide label={toM ? "From" : "To"} sub="Wallet" amount={tokFmt(d.wallet[s] ?? 0, s)} wallet />;
    const mSide = <TSide label={toM ? "To" : "From"} sub="Margin account" amount={tokFmt(mbal(d, s), s)} wallet={false} />;
    const a1 = after ?? before;
    return (
      <>
        <View style={[styles.box, { backgroundColor: colors.bg }]}>
          {toM ? wSide : mSide}
          <View style={styles.bsep}>
            <View style={[styles.bline, { backgroundColor: colors.divider }]} />
            <Pressable
              onPress={() => (setDir(toM ? "WB" : "MB"), setAmt(""), setPct(undefined))}
              disabled={!open}
              style={[styles.flip, { backgroundColor: colors.surface, borderColor: colors.borderControl, opacity: open ? 1 : 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Switch direction"
            >
              <Icon name="swap_vert" size={20} />
            </Pressable>
          </View>
          {toM ? mSide : wSide}
        </View>
        <AmountField
          value={amt}
          onChange={(v) => (setAmt(v), setPct(undefined))}
          sym={s}
          onSym={(t) => (setSym(t), setAmt(""))}
          syms={list}
          meta={(t) => tokFmt(toM ? d.wallet[t] ?? 0 : mbal(d, t), t)}
          usdValue={x * priceOf(s)}
          label="Amount"
          right={toM ? `Wallet ${tokFmt(maxT, s)}` : `Can move ${tokFmt(maxW, s)}`}
          bad={over || belowSafe}
          footer={<View style={{ marginTop: 12 }}><PctChips value={pctV} onPick={(p) => (setPct(p), setAmt(fmtIn(((toM ? maxT : maxW) * p) / 100, s)))} /></View>}
        />
        <View style={[styles.box, { backgroundColor: colors.bg, paddingVertical: 4 }]}>
          {open ? (
            <>
              <TRow show={x > 0} first l="Margin collateral" a={usd(before.collUsd)} b={usd(a1.collUsd)} />
              <TRow show={x > 0} l="Health factor" a={hfFmt(before.hf)} b={hfFmt(a1.hf)} tone={hfTone(a1.hf)} />
              <TRow show={x > 0} l="Liquidation buffer" a={buf(before)} b={buf(a1)} />
            </>
          ) : (
            <>
              <TRow show={x > 0} first l="Margin account" a="Opens with this transfer" b="Opens with this transfer" />
              <TRow show={x > 0} l="Collateral after" a={usd(x * priceOf(s))} b={usd(x * priceOf(s))} />
            </>
          )}
          {(over || belowSafe) && (
            <View style={{ paddingBottom: 12 }}>
              {over && <Note text={`You have ${tokFmt(maxT, s)} to move.`} />}
              {belowSafe && <Note tone="err" text={`Health factor would fall below ${nf(SAFE_HF, 2)}. Most you can move now: ${tokFmt(maxW, s)}.`} />}
            </View>
          )}
        </View>
        {x > 0 && <Button label={over ? `Not enough ${s}` : belowSafe ? "Too much to move" : `Move ${tokFmt(x, s)}`} fam={fam} disabled={over || belowSafe} onPress={go} />}
      </>
    );
  }
  return (
    <>
      <Seg2 items={[["MB", "To margin"], ["WB", "To wallet"]]} value={dir} onChange={(k) => (setDir(k), setAmt(""))} label="Direction" full />
      <AmountField value={amt} onChange={(v) => (setAmt(v), setPct(undefined))} sym={s} onSym={(t) => (setSym(t), setAmt(""))} syms={list} meta={(t) => tokFmt(dir === "MB" ? d.wallet[t] ?? 0 : mbal(d, t), t)} usdValue={x * priceOf(s)} label="Transfer amount" bad={over || belowSafe} />
      <Text style={[styles.cap, { color: colors.muted }]}>
        {dir === "MB" ? "Wallet" : "In your account"} {tokFmt(maxT, s)}
      </Text>
      <PctChips value={pctV} onPick={(p) => (setPct(p), setAmt(fmtIn(((dir === "WB" ? maxW : maxT) * p) / 100, s)))} />
      {over && <Note text={`You have ${tokFmt(maxT, s)} to move.`} />}
      {belowSafe && <Note tone="err" text={`This would take your health factor below ${nf(SAFE_HF, 2)}. Most you can move now: ${tokFmt(maxW, s)}.`} />}
      {after && <Preview rows={[["Health factor", hfFmt(before.hf), hfFmt(after.hf), hfTone(after.hf)], ["Account value", usd(before.assets), usd(after.assets)]]} />}
      <Button label={belowSafe ? "Too much to move" : x > 0 ? `Move ${tokFmt(x, s)}` : "Enter an amount"} fam={fam} disabled={!(x > 0) || over || belowSafe} onPress={go} />
    </>
  );
}

const styles = StyleSheet.create({
  hstats: { flexDirection: "row", paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.26)" },
  hst: { flex: 1, minWidth: 0 },
  sep: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.28)" },
  hl: { color: "rgba(255,255,255,0.96)", fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  hv: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 20, lineHeight: 26, fontVariant: ["tabular-nums"] },
  hs: { color: "rgba(255,255,255,0.86)", fontFamily: font.regular, fontSize: 11, lineHeight: 14 },
  chips: { flexDirection: "row", gap: 8, marginTop: 6 },
  chip: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.16)", justifyContent: "center" },
  chipT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 12, fontVariant: ["tabular-nums", "no-contextual"] },
  acRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  v: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, fontVariant: ["tabular-nums"] },
  rf: { flexDirection: "row", alignItems: "center", marginTop: -8 },
  rh: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eb2: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6 },
  ff: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  addc: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1 },
  hr: { height: 1, marginVertical: 2 },
  strip: { flexDirection: "row", borderRadius: 12, padding: 12, gap: 12 },
  box: { borderRadius: 16, paddingHorizontal: 16 },
  side: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72 },
  si: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  bsep: { height: 0, alignItems: "center", justifyContent: "center" },
  bline: { position: "absolute", left: 0, right: 0, height: 1 },
  flip: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center", zIndex: 1 },
  dr: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
});
