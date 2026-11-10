import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { SubTabs } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/kit";
import { nf, pct, usd } from "@/format";
import { DATA } from "@/sample/data";
import type { Chain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet, openSheet } from "@/ui/overlay";
import { submitEarn } from "@/chain/stellar/submit";
import { solanaEarnSupply, solanaEarnWithdraw } from "@/chain/solana/actions";
import { runTx } from "@/ui/tx";

import { applyEarn, balTok, decOf, freeTok, fullAmt, isStable, lendOf, poolOf, px, shareRate, shareSym } from "./model";

type Mode = "supply" | "withdraw";

// Supply / Withdraw (design SHEETS['ea-amt']): one amount form in a bottom sheet; the CTA names the one thing blocking it.
export function openAmount(chain: Chain, sym: string, mode: Mode) {
  openSheet({ title: sym, content: () => <AmountForm chain={chain} sym={sym} initial={mode} /> });
}

const clean = (t: string, d: number) => {
  let v = t.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const i = v.indexOf(".");
  if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, d);
  return v;
};

function AmountForm({ chain, sym, initial }: { chain: Chain; sym: string; initial: Mode }) {
  useDataVersion();
  const { colors } = useTheme();
  const fam = families.earn;
  const [mode, setMode] = useState<Mode>(initial);
  const [text, setText] = useState("");
  const p = poolOf(chain, sym);
  if (!p) return null;
  const s = p.sym, l = lendOf(chain, s), bal = balTok(l), wal = DATA[chain].wallet[s] ?? 0, d = decOf(s), price = px(s);
  const sup = mode === "supply", limit = sup ? wal : bal, x = parseFloat(text) || 0, free = freeTok(p);
  const problem = !(x > 0) ? "empty" : x > limit + 1e-9 ? "over" : !sup && x > free + 1e-9 ? "pool" : null;
  const after = sup ? bal + x : Math.max(0, bal - x), shares = x / shareRate(chain, s), yearly = (after * price * p.supA) / 100;
  const fillOf = (f: number) => Math.floor(limit * f * Math.pow(10, d)) / Math.pow(10, d);
  const cta = problem === "over" ? (sup ? `Not enough ${s}` : "More than you supplied") : problem === "pool" ? `Vault has ${fullAmt(free, s)} free now` : `${sup ? "Supply" : "Withdraw"} ${s}`;
  const size = text.length > 12 ? 24 : text.length > 9 ? 28 : 32;

  const submit = () => {
    if (problem) return;
    const amt = fullAmt(x, s), sh = `${nf(shares, 2)} ${shareSym(s)}`;
    closeSheet();
    setTimeout(
      () =>
        runTx({
          chain,
          fam,
          title: sup ? "Review supply" : "Review withdrawal",
          cta: sup ? "Confirm supply" : "Confirm withdrawal",
          legs: [
            { l: sup ? "You supply" : "You withdraw", v: amt, s: "~" + usd(x * price) },
            { l: sup ? "You receive" : "Shares redeemed", v: sh, s: `1 ${shareSym(s)} = ${nf(shareRate(chain, s), 4)} ${s}` },
          ],
          rows: [
            ["Supply APY", pct(p.supA), "pos"],
            ["Supplied", `${fullAmt(bal, s)} → ${fullAmt(after, s)}`],
            sup ? ["Est. monthly earnings", "+" + usd((x * price * p.supA) / 100 / 12), "pos"] : ["Free in this vault", fullAmt(free, s)],
          ],
          done: { title: sup ? `Supplied ${amt}` : `Withdrew ${amt}`, line: sup ? `Earning ${pct(p.supA)} APY` : "Back in your wallet", action: ["View my positions", () => router.navigate({ pathname: "/lend", params: { tab: "positions" } })] },
          // Stellar withdraw is `redeem_vtokens`: the amount is vToken shares (website earn-form.tsx), so the typed
          // underlying amount is converted at the pool's live exchange rate.
          send: async () => {
            if (chain === "stellar") {
              return await submitEarn(mode, s, sup ? x : l?.shares && x >= bal - 1e-7 ? l.shares : shares);
            }
            return mode === "supply"
              ? await solanaEarnSupply(s, x)
              : await solanaEarnWithdraw(s, x, !sup && x >= bal - 1e-7);
          },
          apply: () => applyEarn(chain, s, x, mode),
        }),
      300,
    );
  };

  return (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <SubTabs items={[["supply", "Supply"], ["withdraw", "Withdraw"]]} value={mode} onChange={(m) => (setMode(m), setText(""))} fam={fam} />
      <Card style={{ backgroundColor: colors.bg }}>
        <Text style={[styles.lim, { color: colors.muted }]}>
          {sup ? "Wallet" : "Supplied"} {fullAmt(limit, s)}
        </Text>
        <View style={styles.ir}>
          <TextInput
            value={text}
            onChangeText={(t) => setText(clean(t, d))}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            accessibilityLabel={sup ? "Supply amount" : "Withdraw amount"}
            style={[styles.in, { color: problem === "over" || problem === "pool" ? colors.negative : colors.text, fontSize: size }]}
          />
          <View style={[styles.tp, { backgroundColor: colors.surface }]}>
            <TokenLogo sym={s} size={28} />
            <Text style={[styles.tpT, { color: colors.text }]}>{s}</Text>
          </View>
        </View>
        {!isStable(s) && <Text style={[styles.lim, { color: colors.muted, textAlign: "left" }]}>~{usd(x * price)}</Text>}
        <View style={styles.qfs}>
          {(
            [
              ["25%", 0.25],
              ["50%", 0.5],
              ["Max", 1],
            ] as [string, number][]
          ).map(([lb, f]) => {
            const v = fillOf(f), on = x > 0 && Math.abs(x - v) < 1e-9 && v > 0;
            return (
              <Pressable
                key={lb}
                onPress={() => setText(v > 0 ? String(v) : "")}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.qf, { borderColor: on ? fam.tab : colors.borderControl, backgroundColor: on ? colors.tealTint : "transparent" }]}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? colors.onTealTint : colors.text }}>{lb}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card style={{ backgroundColor: colors.bg, paddingVertical: 4, gap: 0 }}>
        {(
          [
            ["Supply APY", pct(p.supA), "pos"],
            [sup ? "You receive" : "Shares redeemed", `${nf(shares, 2)} ${shareSym(s)}`],
            ["Supplied", `${fullAmt(bal, s)} → ${fullAmt(after, s)}`],
            sup ? ["Yearly earnings", "+" + usd(yearly), "pos"] : ["Free in vault", fullAmt(free, s)],
          ] as [string, string, string?][]
        ).map(([lb, v, t], i) => (
          <View key={lb} style={[styles.dr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text style={[styles.drl, { color: colors.muted }]}>{lb}</Text>
            <Text style={[styles.drv, { color: t === "pos" ? colors.positive : colors.text }]} numberOfLines={1}>
              {v}
            </Text>
          </View>
        ))}
      </Card>
      {/* design V5 T2: no CTA until there is an amount */}
      {problem !== "empty" && <Button label={cta} fam={fam} disabled={!!problem} icon={problem ? undefined : "fingerprint"} onPress={submit} />}
    </View>
  );
}

const styles = StyleSheet.create({
  lim: { fontFamily: font.regular, fontSize: 12, textAlign: "right", fontVariant: ["tabular-nums"] },
  ir: { flexDirection: "row", alignItems: "center", gap: 12 },
  in: { flex: 1, minWidth: 0, fontFamily: font.semibold, paddingVertical: 4, fontVariant: ["tabular-nums"] },
  tp: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingLeft: 6, paddingRight: 12, borderRadius: 20 },
  tpT: { fontFamily: font.semibold, fontSize: 16 },
  qfs: { flexDirection: "row", gap: 8 },
  qf: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dr: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  drl: { fontFamily: font.regular, fontSize: 14 },
  drv: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
});
