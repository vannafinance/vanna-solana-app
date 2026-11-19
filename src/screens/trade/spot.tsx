import { useEffect, useRef, useState } from "react";
import { type HostInstance, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { TokenLogo } from "@/components/brand";
import { cleanAmt, hfTone, PctChips, Preview, TokenPill } from "@/components/form";
import { HistoryList } from "@/components/history";
import { SubTabs, Swap } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/kit";
import { hfFmt, nf, pct, tokFmt, usd } from "@/format";
import { ACTIVITY, type ChainData, DATA, POOLS_BY, PX, TOK } from "@/sample/data";
import { acct, mAddDebt, mAddIdle, mPayDebt, simAcct } from "@/sample/model";
import { nowT } from "@/screens/earn/model";
import { type Chain, useChain } from "@/state/chain";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { openMenu, openSheet } from "@/ui/overlay";
import { runTx } from "@/ui/tx";
import { haptic } from "@/ui/haptics";
import { solanaDepositAndBorrow, solanaMarginSwap } from "@/chain/solana/actions";
import { onTitanAvailability, probeTitan, TITAN_UNAVAILABLE, titanAvailableCached } from "@/chain/solana/titan";

/* Spot (design screens/trade.js): Swap | History. A swap runs inside the margin account: it spends idle funds, then the token's long,
   then collateral (if allowed), then borrows the rest (a borrowing swap opens a long or a short). S8: a swap is not a position. */
const fam = families.spot;
export const SPOT_TOKS: Record<Chain, string[]> = {
  solana: ["SOL", "USDC", "USDT", "JitoSOL", "JupSOL", "JupUSD", "NVDAx", "GOOGLx", "AAPLx", "TSLAx"],
};
// Jupiter quotes come straight from Jupiter. Titan quotes come from the website's route, which holds the Titan key (a secret the
// app cannot carry; src/chain/solana/titan.ts). When that route cannot serve the app (not opened for it yet, no key, offline),
// Titan stays in the menu, greyed out with "Titan is unavailable right now", and swaps run through Jupiter.
const VENUES: Record<Chain, [string, string][]> = { solana: [["Jupiter", "JUP"], ["Titan", "TITAN"]] };
const isTitan = (v: [string, string]) => v[1] === "TITAN";
const FEE = 0.0003;
const stable = (s: string) => !!TOK[s]?.stable;
const px = (s: string) => PX[s] ?? 0;

const held = (d: ChainData, s: string) => (d.margin.avail[s] ?? 0) + d.spot.filter((x) => x.sym === s && x.side === "long").reduce((t, x) => t + x.qty, 0);
const collOf = (d: ChainData, s: string) => d.margin.coll.find((c) => c.sym === s)?.amt ?? 0;

// The swap applied to (a copy of) the chain's data.
function applySwap(d: ChainData, pay: string, x: number, recv: string, y: number, useColl: boolean) {
  let rest = x;
  const idle = d.margin.avail[pay] ?? 0, a = Math.min(idle, rest);
  d.margin.avail[pay] = idle - a;
  rest -= a;
  for (const p of d.spot.filter((q) => q.sym === pay && q.side === "long")) {
    if (rest <= 0) break;
    const t = Math.min(p.qty, rest);
    p.qty -= t;
    rest -= t;
  }
  d.spot = d.spot.filter((q) => q.qty > 1e-9);
  if (useColl && rest > 0) {
    const c = d.margin.coll.find((q) => q.sym === pay);
    if (c) {
      const t = Math.min(c.amt, rest);
      c.amt -= t;
      rest -= t;
    }
  }
  if (rest > 1e-9) {
    mAddDebt(d, pay, rest);
    if (!stable(pay)) d.spot.push({ id: "s" + Date.now(), sym: pay, side: "short", qty: rest, entry: px(pay), t: nowT() });
  }
  if (stable(recv)) {
    mAddIdle(d, recv, y);
  } else {
    let left = y;
    for (const sh of d.spot.filter((q) => q.sym === recv && q.side === "short")) {
      const t = Math.min(sh.qty, left);
      sh.qty -= t;
      mPayDebt(d, recv, t);
      left -= t;
    }
    d.spot = d.spot.filter((q) => q.qty > 1e-9);
    if (left > 1e-9) {
      const l = d.spot.find((q) => q.sym === recv && q.side === "long");
      if (l) {
        l.entry = (l.entry * l.qty + px(recv) * left) / (l.qty + left);
        l.qty += left;
      } else d.spot.push({ id: "s" + Date.now(), sym: recv, side: "long", qty: left, entry: px(recv), t: nowT() });
    }
  }
}

export function Spot() {
  const [tab, setTab] = useState<"swap" | "history">("swap");
  const { chain } = useChain();
  return (
    <View style={{ gap: 12 }}>
      <SubTabs items={[["swap", "Swap"], ["history", "History"]]} value={tab} onChange={setTab} fam={fam} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>{tab === "swap" ? <SwapCard /> : <HistoryList rows={ACTIVITY[chain].filter((r) => r.area === "Spot")} empty="No swaps yet" module="trade" />}</View>
      </Swap>
    </View>
  );
}

// Slippage (design mv-swap-settings): Auto uses 0.5%; Custom offers 0.1 / 0.5 / 1.0% or your own number.
let SLIPPAGE: { auto: boolean; v: number } = { auto: true, v: 0.5 };
export const slippage = () => (SLIPPAGE.auto ? 0.5 : SLIPPAGE.v);
const setSlippage = (n: typeof SLIPPAGE) => {
  SLIPPAGE = n;
};

function SwapSettings() {
  const { colors } = useTheme();
  const [st, setSt] = useState(SLIPPAGE);
  const [txt, setTxt] = useState(String(SLIPPAGE.v));
  const save = (n: typeof SLIPPAGE) => {
    setSlippage(n);
    setSt(n);
  };
  return (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.text }}>SLIPPAGE TOLERANCE</Text>
      <View style={[styles.st2, { borderColor: colors.border }]}>
        {([true, false] as const).map((a) => (
          <Pressable key={String(a)} onPress={() => save({ ...st, auto: a })} style={[styles.st2i, st.auto === a && { backgroundColor: "#703AE6" }]} accessibilityRole="tab" accessibilityState={{ selected: st.auto === a }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: st.auto === a ? "#FFFFFF" : colors.text }}>{a ? "Auto" : "Custom"}</Text>
          </Pressable>
        ))}
      </View>
      {!st.auto && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[0.1, 0.5, 1].map((v) => {
            const on = Math.abs(st.v - v) < 1e-9;
            return (
              <Pressable key={v} onPress={() => (save({ auto: false, v }), setTxt(String(v)))} style={[styles.sl, { borderColor: on ? "#703AE6" : colors.borderControl, backgroundColor: on ? colors.purpleTint : "transparent" }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? colors.onPurpleTint : colors.text }}>{v.toFixed(1)}%</Text>
              </Pressable>
            );
          })}
          <View style={[styles.sl, { flex: 1.3, flexDirection: "row", gap: 4, borderColor: colors.borderControl }]}>
            <TextInput
              value={txt}
              onChangeText={(t) => {
                const c = cleanAmt(t, 2);
                setTxt(c);
                const n = parseFloat(c);
                if (n > 0 && n <= 50) save({ auto: false, v: n });
              }}
              keyboardType="decimal-pad"
              accessibilityLabel="Custom slippage"
              style={{ minWidth: 36, textAlign: "right", fontFamily: font.semibold, fontSize: 15, color: colors.text, paddingVertical: 0 }}
            />
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.muted }}>%</Text>
          </View>
        </View>
      )}
      {!st.auto && st.v > 3 && <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.warning }}>High slippage: the swap may fill at a much worse price.</Text>}
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>
        Auto uses 0.5%. Swaps expire with their Solana blockhash (about a minute), so there is no deadline setting.
      </Text>
    </View>
  );
}

function SwapCard() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const [venue, setVenue] = useState(0);
  // null until the first check: Titan can be picked meanwhile; a failed quote then says it is unavailable.
  const [titanOk, setTitanOk] = useState<boolean | null>(titanAvailableCached());
  useEffect(() => {
    let live = true;
    void probeTitan().then((ok) => live && setTitanOk(ok));
    const off = onTitanAvailability((ok) => live && setTitanOk(ok));
    return () => {
      live = false;
      off();
    };
  }, []);
  const picked = VENUES[chain][venue] ?? VENUES[chain][0];
  // Titan unavailable: fall back to Jupiter.
  const ven = isTitan(picked) && titanOk === false ? VENUES[chain][0] : picked;
  const toks = SPOT_TOKS[chain];
  const [pay, setPay] = useState(toks[0]);
  const [recv, setRecv] = useState(toks[1]);
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  // Every token in the margin account is collateral and swappable at once (the website's rule); the health check runs after the swap.
  const useColl = true;
  const venueRef = useRef<HostInstance>(null);
  const payBox = useRef<HostInstance>(null);
  const recvBox = useRef<HostInstance>(null);
  const flipR = useSharedValue(0);
  const flipSt = useAnimatedStyle(() => ({ transform: [{ rotate: `${flipR.value}deg` }] }));

  const p = toks.includes(pay) ? pay : toks[0];
  const r = toks.includes(recv) && recv !== p ? recv : toks.find((t) => t !== p)!;
  const x = parseFloat(amt) || 0;
  const y = (x * px(p) * (1 - FEE)) / Math.max(1e-12, px(r));
  const swappable = held(d, p) + (useColl ? collOf(d, p) : 0);
  const borrow = Math.max(0, x - swappable);
  const before = acct(chain);
  const after = x > 0 ? simAcct(chain, (c) => applySwap(c, p, x, r, y, useColl)) : null;
  // As on the website (SwapCard): blocked only when the swap LOWERS the borrow-line health factor and ends below 1.15.
  const unsafe = after != null && after.borrowHf < 1.15 && after.borrowHf < before.borrowHf;
  const dec = (s: string) => (stable(s) ? 2 : 4);
  const fmt = (v: number, s: string) => (v > 0 ? String(Math.floor(v * 10 ** dec(s)) / 10 ** dec(s)) : "");

  // flip: the tokens trade places and the amount you would have received becomes the amount you pay (nothing is lost)
  const flip = () => {
    haptic.tap();
    flipR.value = withTiming(flipR.value + 180, { duration: 260, easing: Easing.bezier(0.2, 0, 0, 1) });
    setPay(r);
    setRecv(p);
    setAmt(fmt(y, r));
    setPct(undefined);
  };
  const pickPay = (t: string) => {
    if (t === r) return flip();
    setPay(t);
    setAmt("");
    setPct(undefined);
  };
  const pickRecv = (t: string) => {
    if (t === p) return flip();
    setRecv(t);
  };

  const go = () =>
    runTx({
      chain, fam, title: "Review swap", cta: borrow > 0 ? "Borrow and swap" : "Swap",
      legs: [
        { l: "You pay", v: tokFmt(x, p), s: borrow > 0 ? `${tokFmt(borrow, p)} borrowed` : "From your margin account" },
        { l: "You receive", v: tokFmt(y, r), s: `via ${ven[0]}` },
      ],
      rows: [["Rate", `1 ${p} = ${nf(px(p) / px(r), px(p) / px(r) < 1 ? 4 : 2)} ${r}`], ["Minimum received", tokFmt(y * (1 - slippage() / 100), r)], ["Route fee", pct(FEE * 100)], ["Health factor", `${hfFmt(before.hf)} → ${hfFmt(after!.hf)}`]],
      done: { title: `Swapped ${tokFmt(x, p)}`, line: `Received ${tokFmt(y, r)}` },
      send: async () => {
        const slipPct = slippage();
        if (borrow > 0) {
          await solanaDepositAndBorrow({ borrows: [{ sym: p, amount: borrow }] });
        }
        return await solanaMarginSwap({
          fromSym: p,
          toSym: r,
          amount: x,
          slippageBps: Math.round(slipPct * 100),
          venue: isTitan(ven) ? "titan" : "jupiter",
        });
      },
      apply: () => {
        applySwap(d, p, x, r, y, useColl);
        const side = !stable(r) ? "Long" : !stable(p) && borrow > 0 ? "Short" : "Swap";
        ACTIVITY[chain].unshift({ t: nowT(), area: "Spot", action: side, detail: `${p} to ${r}`, amt: `−${tokFmt(x, p)}, +${tokFmt(y, r)}`, usd: x * px(p), via: ven[0], tx: "", sym: stable(r) ? p : r });
        setAmt("");
        setPct(undefined);
      },
    });

  const openVenueMenu = () =>
    openMenu(
      venueRef,
      (close) => (
        <>
          {VENUES[chain].map((v, i) => {
            const [nm, logo] = v;
            const off = isTitan(v) && titanOk === false;
            const on = VENUES[chain][i] === ven;
            return (
              <Pressable
                key={nm}
                disabled={off}
                onPress={() => {
                  setVenue(i);
                  close();
                }}
                style={[styles.mi, on && { backgroundColor: colors.purpleTint }, off && { opacity: 0.5 }]}
                accessibilityRole="menuitem"
                accessibilityState={{ disabled: off, selected: on }}
                accessibilityHint={off ? TITAN_UNAVAILABLE : undefined}
              >
                <TokenLogo sym={logo} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{nm}</Text>
                  {off && <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.muted }}>{TITAN_UNAVAILABLE}</Text>}
                </View>
                {on && <Icon name="check" size={18} color="link" />}
              </Pressable>
            );
          })}
        </>
      ),
      { width: 250, alignLeft: true },
    );

  return (
    <>
      <Card style={{ gap: 12 }}>
        <View style={styles.head}>
          <Pressable
            ref={venueRef}
            onPress={openVenueMenu}
            style={[styles.via, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Route via ${ven[0]}, change`}
          >
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>via</Text>
            <TokenLogo sym={ven[1]} size={18} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>{ven[0]}</Text>
            <Icon name="expand_more" size={16} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => openSheet({ title: "Swap settings", content: () => <SwapSettings /> })} hitSlop={8} accessibilityRole="button" accessibilityLabel="Swap settings">
            <Icon name="tune" size={22} color="muted" />
          </Pressable>
        </View>

        {/* You pay */}
        <View ref={payBox} style={[styles.box, { backgroundColor: colors.bg, borderColor: unsafe ? colors.negative : "transparent" }]}>
          <Text style={[styles.lab, { color: colors.muted }]}>You pay</Text>
          <View style={styles.side}>
            <TokenPill
              sym={p}
              syms={toks}
              onSym={pickPay}
              meta={(t) => nf(held(d, t) + collOf(d, t), stable(t) ? 2 : 4)}
            />
            <TextInput
              value={amt}
              onChangeText={(t) => (setAmt(cleanAmt(t)), setPct(undefined))}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              accessibilityLabel="You pay"
              style={[styles.amt, { color: unsafe ? colors.negative : colors.text }]}
            />
          </View>
          <View style={styles.side}>
            <Text style={[styles.cap, { color: colors.muted }]}>Swappable {nf(swappable, dec(p))}</Text>
            <Text style={[styles.cap, { color: colors.muted }]}>{x > 0 ? "~" + usd(x * px(p)) : ""}</Text>
          </View>
          <PctChips value={pctV} items={[25, 50, 75, 100]} onPick={(q) => (setPct(q), setAmt(fmt((swappable * q) / 100, p)))} />
        </View>

        {/* flip: centred between the two boxes, over their edges */}
        <View style={styles.flipRow} pointerEvents="box-none">
          <Pressable onPress={flip} style={[styles.flip, { backgroundColor: colors.chipActive, borderColor: colors.surface }]} accessibilityRole="button" accessibilityLabel="Flip tokens">
            <Animated.View style={flipSt}>
              <Icon name="swap_vert" size={26} color={colors.onChipActive} />
            </Animated.View>
          </Pressable>
        </View>

        {/* You receive */}
        <View ref={recvBox} style={[styles.box, { backgroundColor: colors.bg, borderColor: "transparent" }]}>
          <Text style={[styles.lab, { color: colors.muted }]}>You receive</Text>
          <View style={styles.side}>
            <TokenPill
              sym={r}
              syms={toks}
              onSym={pickRecv}
              meta={(t) => nf(held(d, t) + collOf(d, t), stable(t) ? 2 : 4)}
            />
            <Text style={[styles.amt, { color: y > 0 ? colors.text : colors.muted }]} numberOfLines={1}>
              {y > 0 ? nf(y, dec(r)) : "0"}
            </Text>
          </View>
          {y > 0 && <Text style={[styles.cap, { color: colors.muted, textAlign: "right" }]}>~{usd(y * px(r))}</Text>}
        </View>

        {borrow > 0 && x > 0 && (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>
            Borrows {tokFmt(borrow, p)} at {pct(POOLS_BY[chain].find((q) => q.sym === p)?.borA ?? 0)} APY{stable(p) ? "" : `, opening a ${p} short`}.
          </Text>
        )}
        {after && <Preview rows={[["Health factor", hfFmt(before.hf), hfFmt(after.hf), hfTone(after.hf)], ["Borrowed", usd(before.debtUsd), usd(after.debtUsd)]]} />}
        <Button label={!(x > 0) ? "Enter an amount" : unsafe ? "Below the safe floor" : borrow > 0 ? "Borrow and swap" : "Swap"} fam={fam} disabled={!(x > 0) || unsafe} onPress={go} />
      </Card>

    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  via: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1 },
  mi: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 12, marginHorizontal: 6, borderRadius: 12 },
  box: { borderRadius: 16, padding: 14, gap: 10, borderWidth: 1 },
  lab: { fontFamily: font.regular, fontSize: 13 },
  side: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  amt: { flex: 1, minWidth: 0, textAlign: "right", fontFamily: font.semibold, fontSize: 28, paddingVertical: 0, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  hr: { height: 1 },
  flipRow: { height: 0, alignItems: "center", justifyContent: "center", zIndex: 2 },
  flip: { width: 52, height: 52, borderRadius: 26, borderWidth: 5, alignItems: "center", justifyContent: "center" },
  rch: { flexDirection: "row", padding: 4, borderRadius: 12, gap: 4 },
  st2: { flexDirection: "row", borderRadius: 24, borderWidth: 1, padding: 3 },
  st2i: { flex: 1, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sl: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rc: { flex: 1, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});

