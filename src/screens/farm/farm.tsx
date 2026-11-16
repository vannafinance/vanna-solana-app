import { type Href, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";

import { TokenLogo } from "@/components/brand";
import { AmountField, hfTone, PctChips, Preview } from "@/components/form";
import { HistoryList } from "@/components/history";
import { SubTabs, Swap } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, Tag } from "@/components/ui/kit";
import { hfFmt, nf, pct, sUsd, tokFmt, usd } from "@/format";
import { ACTIVITY, type ChainData, DATA, type FarmPos, PX } from "@/sample/data";
import { acct, mAddColl, mbal, mTake, SAFE_HF, simAcct } from "@/sample/model";
import { nowT, randTx } from "@/screens/earn/model";
import { type Chain, useChain } from "@/state/chain";
import { personalReady } from "@/state/personal";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet, openSheet, toast } from "@/ui/overlay";
import { runTx } from "@/ui/tx";
import { openShare } from "@/screens/share/share";
import { solanaFarmDeposit, solanaFarmWithdraw } from "@/chain/solana/actions";
import * as solanaActions from "@/chain/solana/actions";
const solanaPerenaAction: (vaultId: string, call: "deposit" | "withdraw", amountUi: number | string) => Promise<string> = (solanaActions as any).solanaPerenaAction;

/* Farm (design screens/farm.js): Vaults | Positions | History. Deposits come from the margin account (borrowed or idle funds),
   so the hero is the account strip. */
export type Vault = {
  id: string; group: string; name: string; sym: string; icon: string; venue: string; venueLogo: string;
  apy: number; apyLabel: string; a: [string, string]; b: [string, string];
  // Live figures for the vault page (live.ts): lending reserves' borrow APY, totals in USD and utilisation (%).
  borrowApy?: number; supplyUsd?: number; borrowUsd?: number; util?: number;
};
export const usdC = (n: number) => (n >= 1e9 ? "$" + nf(n / 1e9, 2) + "B" : n >= 1e6 ? "$" + nf(n / 1e6, 2) + "M" : n >= 1e3 ? "$" + nf(n / 1e3, 2) + "K" : usd(n));

export const VAULTS: Record<Chain, Vault[]> = {
  solana: [
    { id: "kamino-sol", group: "Single assets", name: "SOL", sym: "SOL", icon: "SOL", venue: "Kamino", venueLogo: "KMNO", apy: 4.13, apyLabel: "APY", a: ["Total deposits", usdC(270052719.73)], b: ["Utilization", "90.48%"] },
    { id: "kamino-usdc", group: "Single assets", name: "USDC", sym: "USDC", icon: "USDC", venue: "Kamino", venueLogo: "KMNO", apy: 4.43, apyLabel: "APY", a: ["Total deposits", usdC(122289228.91)], b: ["Utilization", "91.17%"] },
    { id: "kamino-usdt", group: "Single assets", name: "USDT", sym: "USDT", icon: "USDT", venue: "Kamino", venueLogo: "KMNO", apy: 4.13, apyLabel: "APY", a: ["Total deposits", usdC(11105247.27)], b: ["Utilization", "88.00%"] },
    { id: "usdstar", group: "Perena vaults", name: "USD*", sym: "USDC", icon: "USDSTAR", venue: "Perena", venueLogo: "PERENA", apy: 9.46, apyLabel: "APY 7D", a: ["TVL", usdC(11472093.92)], b: ["Share price", "$1.1018"] },
    { id: "junior", group: "Perena vaults", name: "USD* Junior", sym: "USDC", icon: "USDSTARJ", venue: "Perena", venueLogo: "PERENA", apy: 14.18, apyLabel: "APY 7D", a: ["TVL", usdC(1520887.48)], b: ["Share price", "$1.0892"] },
  ],
};

export const px = (s: string) => PX[s] ?? 1;
export const posOf = (d: ChainData, id: string) => d.farm.find((f) => f.id === id);
// A position read from the chain carries no rate of its own: it earns its vault's live one.
export const apyOf = (chain: Chain, f: FarmPos) => VAULTS[chain].find((v) => v.id === f.id)?.apy ?? f.apy;
export const valOf = (f: FarmPos) => (f.amt + f.earned) * px(f.sym);

export function farmTotals(chain: Chain) {
  const fs = DATA[chain].farm, val = fs.reduce((t, f) => t + valOf(f), 0);
  const apy = val ? fs.reduce((t, f) => t + valOf(f) * apyOf(chain, f), 0) / val : 0;
  return { val, apy };
}

export function Farm() {
  const { chain } = useChain();
  const [tab, setTab] = useState<"vaults" | "positions" | "history">("vaults");
  const f = families.farm;
  return (
    <View style={{ gap: 12 }}>
      <SubTabs items={[["vaults", "Vaults"], ["positions", "Positions"], ["history", "History"]]} value={tab} onChange={setTab} fam={f} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>
          {tab === "vaults" ? <Vaults /> : tab === "positions" ? <Positions /> : <HistoryList rows={ACTIVITY[chain].filter((r) => r.area === "Farm")} module="farm" />}
        </View>
      </Swap>
    </View>
  );
}

function Vaults() {
  useDataVersion();
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const list = VAULTS[chain];
  const groups = [...new Set(list.map((v) => v.group))];
  return (
    <>
      {groups.map((g) => (
        <View key={g} style={{ gap: 12 }}>
          <Text style={[styles.gh, { color: colors.text }]}>{g}</Text>
          {list
            .filter((v) => v.group === g)
            .map((v) => {
              const pos = posOf(d, v.id);
              return (
                <Pressable key={v.id} onPress={() => openVault(v.id)} accessibilityRole="button" accessibilityLabel={`${v.name} on ${v.venue}, ${pct(v.apy)} ${v.apyLabel}`}>
                  <Card>
                    <View style={styles.vh}>
                      <VaultIcon v={v} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.name, { color: colors.text }]}>{v.name}</Text>
                        <Text style={[styles.cap, { color: colors.muted }]}>{v.venue}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.apy, { color: colors.positive }]}>{pct(v.apy)}</Text>
                        <Text style={[styles.cap, { color: colors.muted }]}>{v.apyLabel}</Text>
                      </View>
                    </View>
                    <Pairs items={[{ label: v.a[0], value: v.a[1] }, { label: v.b[0], value: v.b[1] }]} />
                    {pos && (
                      <View style={styles.hold}>
                        <Text style={[styles.holdL, { color: colors.muted }]}>Holding</Text>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[styles.holdV, { color: colors.text }]}>{tokFmt(pos.amt + pos.earned, pos.sym)}</Text>
                          <Text style={[styles.cap, { color: colors.muted }]}>{usd(valOf(pos))}</Text>
                        </View>
                      </View>
                    )}
                  </Card>
                </Pressable>
              );
            })}
        </View>
      ))}
    </>
  );
}

export function VaultIcon({ v, size = 40 }: { v: Vault; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <TokenLogo sym={v.icon} size={size} />
      <View style={styles.ven}>
        <TokenLogo sym={v.venueLogo} size={16} />
      </View>
    </View>
  );
}

// V7 Positions: Withdraw all sends every position back to the margin account, then the review sheet.
function openWithdrawAll(chain: Chain) {
  if (!personalReady(chain)) return toast("Connect a wallet to withdraw");
  const list = DATA[chain].farm;
  if (!list.length) return toast("No farm positions to withdraw");
  const before = acct(chain);
  const apply = (c: ChainData) => {
    for (const f of c.farm) {
      c.margin.avail[f.sym] = (c.margin.avail[f.sym] ?? 0) + f.amt + f.earned;
    }
    c.farm = [];
  };
  const after = simAcct(chain, apply);
  if (isFinite(before.hf) && before.hf >= SAFE_HF && after.hf < SAFE_HF) return toast(`Health factor would fall below ${nf(SAFE_HF, 2)}`);
  const total = list.reduce((s, f) => s + valOf(f), 0);
  const earned = list.reduce((s, f) => s + f.earned * px(f.sym), 0);
  const by: Record<string, number> = {};
  list.forEach((f) => (by[f.sym] = (by[f.sym] ?? 0) + f.amt + f.earned));
  runTx({
    chain,
    fam: families.farm,
    title: "Review withdraw all",
    cta: `Withdraw ${usd(total)}`,
    legs: [
      { l: "You withdraw", v: usd(total), s: `${list.length} farm position${list.length === 1 ? "" : "s"}` },
      { l: "To your margin account", v: Object.keys(by).map((s) => tokFmt(by[s], s)).join(", "), s: `+${usd(earned)} earnings realized` },
    ],
    rows: [
      ...list.map((f) => {
        const v = VAULTS[chain].find((x) => x.id === f.id);
        return [v ? `${v.venue} ${v.name}` : f.name, usd(valOf(f))] as [string, string];
      }),
      ["Exit fee", "None"],
      ["Health factor", `${hfFmt(before.hf)} → ${hfFmt(after.hf)}`],
    ],
    done: { title: "All farm positions withdrawn", line: `${usd(total)} back in your margin account` },
    send: async () => {
      let last = "";
      for (const f of list) {
        const v = VAULTS[chain].find((x) => x.id === f.id);
        if (!v) continue;
        if (v.id === "usdstar" || v.id === "junior" || v.venue === "Perena") {
          last = await solanaPerenaAction(v.id, "withdraw", f.amt + f.earned);
        } else {
          last = await solanaFarmWithdraw({ sym: v.sym, all: true });
        }
      }
      return last;
    },
    apply: () => {
      apply(DATA[chain]);
      ACTIVITY[chain].unshift({ t: nowT(), area: "Farm", action: "Withdraw", detail: "All farm positions", amt: usd(total), usd: total, via: "Farm", tx: randTx(), sym: list[0]?.sym ?? "USDC" });
    },
  });
}

function Positions() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const ids = new Set(VAULTS[chain].map((v) => v.id));
  const list = personalReady(chain) ? d.farm.filter((f) => ids.has(f.id)) : [];
  if (!list.length) return <EmptyCard title="No positions here" module="farm" />;
  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <Button label="Withdraw all" v="outline" size="md" onPress={() => openWithdrawAll(chain)} style={{ paddingHorizontal: 16 }} />
      </View>
      {list.map((f) => {
        const v = VAULTS[chain].find((x) => x.id === f.id)!;
        const e = f.earned * px(f.sym);
        return (
          <Card key={f.id}>
            <Pressable onPress={() => openVault(v.id)} accessibilityRole="button" accessibilityLabel={`Open ${v.name}`} style={styles.vh}>
              <VaultIcon v={v} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.name, { color: colors.text }]}>{v.name}</Text>
                <Tag label="Farm" tone="teal" />
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.name, { color: colors.text }]}>{usd(valOf(f))}</Text>
                <Text style={[styles.cap, { color: colors.positive }]}>{sUsd(e)}</Text>
              </View>
            </Pressable>
            <Pairs items={[{ label: "Deposited", value: tokFmt(f.amt, f.sym) }, { label: v.apyLabel, value: pct(apyOf(chain, f)), tone: "pos" }, { label: "Since", value: f.since || "—" }]} />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              <IconAction icon="south" label={`Deposit more in ${v.name}`} onPress={() => openFarm(chain, v, "deposit")} />
              <IconAction icon="north" label={`Withdraw from ${v.name}`} onPress={() => openFarm(chain, v, "withdraw")} />
              <IconAction icon={shareIcon} label={`Share ${v.name}`} onPress={() => openShare({ kind: "farm", id: v.id })} />
            </View>
          </Card>
        );
      })}
    </>
  );
}

// A vault card opens its detail screen (design: farm-vault / farm-position); the sheet below is its Supply / Withdraw.
export const openVault = (id: string) => router.push(`/farm/vault/${id}` as Href);

export function openFarm(chain: Chain, v: Vault, mode: "deposit" | "withdraw") {
  openSheet({ title: v.name, content: () => <FarmForm chain={chain} v={v} initial={mode} /> });
}

function FarmForm({ chain, v, initial }: { chain: Chain; v: Vault; initial: "deposit" | "withdraw" }) {
  const { colors } = useTheme();
  const d = DATA[chain];
  const f = families.farm;
  const [mode, setMode] = useState(initial);
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  const pos = posOf(d, v.id);
  const dep = mode === "deposit";
  const limit = dep ? mbal(d, v.sym) : pos ? pos.amt + pos.earned : 0;
  const x = parseFloat(amt) || 0;
  const over = x > limit + 1e-9;
  const apply = (c: ChainData) => {
    const p = c.farm.find((q) => q.id === v.id);
    if (dep) {
      mTake(c, v.sym, x);
      if (p) p.amt += x;
      else c.farm.push({ id: v.id, venue: v.venue, name: v.name, sym: v.sym, icon: v.icon, amt: x, apy: v.apy, earned: 0, since: "Oct 7" });
    } else if (p) {
      p.amt -= x;
      if (p.amt < 0) {
        p.earned = Math.max(0, p.earned + p.amt);
        p.amt = 0;
      }
      if (p.amt + p.earned < 1e-6) c.farm = c.farm.filter((q) => q !== p);
      mAddColl(c, v.sym, x);
    }
  };
  const before = acct(chain);
  const after = x > 0 && !over ? simAcct(chain, apply) : null;
  const go = () => {
    closeSheet();
    setTimeout(
      () =>
        runTx({
          chain, fam: f, title: dep ? "Review deposit" : "Review withdrawal", cta: dep ? "Deposit" : "Withdraw",
          legs: [{
            l: dep ? "You deposit" : "You withdraw",
            v: tokFmt(x, v.sym),
            s: dep ? "From your margin account" : "Back to your margin account",
          }],
          rows: [[v.apyLabel, pct(v.apy), "pos"], ["Venue", v.venue], ["Health factor", `${hfFmt(before.hf)} → ${hfFmt(after!.hf)}`]],
          done: { title: dep ? `Deposited ${tokFmt(x, v.sym)}` : `Withdrew ${tokFmt(x, v.sym)}`, line: dep ? `Earning ${pct(v.apy)} on ${v.venue}` : "Back in your margin account" },
          send: async () => {
            if (v.id === "usdstar" || v.id === "junior" || v.venue === "Perena") {
              return await solanaPerenaAction(v.id, mode, x);
            }
            return mode === "deposit"
              ? await solanaFarmDeposit({ sym: v.sym, marginAmount: x })
              : await solanaFarmWithdraw({ sym: v.sym, receipts: x, all: pctV === 100 });
          },
          apply: () => {
            apply(d);
            ACTIVITY[chain].unshift({ t: nowT(), area: "Farm", action: dep ? "Deposit" : "Withdraw", detail: `${v.name} on ${v.venue}`, amt: tokFmt(x, v.sym), usd: x * px(v.sym), via: v.venue, tx: randTx(), sym: v.sym });
          },
        }),
      300,
    );
  };
  return (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <Card style={{ backgroundColor: colors.bg }}>
        <View style={styles.vh}>
          <VaultIcon v={v} size={36} />
          <Text style={[styles.cap, { color: colors.muted, flex: 1 }]}>{v.venue}</Text>
          <Text style={[styles.apy, { color: colors.positive, fontSize: 20 }]}>{pct(v.apy)}</Text>
        </View>
      </Card>
      <SubTabs items={[["deposit", "Deposit"], ["withdraw", "Withdraw"]]} value={mode} onChange={(m) => (setMode(m), setAmt(""))} fam={f} />
      <AmountField
        value={amt}
        onChange={(t) => {
          setAmt(t);
          setPct(undefined);
        }}
        sym={v.sym}
        usdValue={x * px(v.sym)}
        label={dep ? "Deposit amount" : "Withdraw amount"}
        bad={over}
        right={`${dep ? "In your account" : "Deposited"} ${nf(limit, 2)}`}
      />
      <PctChips
        value={pctV}
        items={[25, 50, 75, 100]}
        onPick={(q) => {
          setPct(q);
          setAmt(String(Math.floor(limit * q) / 100));
        }}
      />
      {dep && limit <= 0 && <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>No idle {v.sym} in your margin account. Borrow or transfer on Margin first.</Text>}
      {after && (
        <Preview
          rows={[
            ["Health factor", hfFmt(before.hf), hfFmt(after.hf), hfTone(after.hf)],
            [dep ? "Yearly earnings" : "Deposited", dep ? "—" : tokFmt(pos ? pos.amt : 0, v.sym), dep ? "+" + usd((x * px(v.sym) * v.apy) / 100) : tokFmt(Math.max(0, (pos ? pos.amt : 0) - x), v.sym), dep ? "pos" : ""],
          ]}
        />
      )}
      {x > 0 && <Button label={over ? (dep ? `Not enough ${v.sym}` : "More than deposited") : dep ? "Deposit" : "Withdraw"} fam={f} disabled={over} onPress={go} />}
    </View>
  );
}

const styles = StyleSheet.create({
  gh: { fontFamily: font.semibold, fontSize: 18, marginTop: 4 },
  vh: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontFamily: font.semibold, fontSize: 17, lineHeight: 22, fontVariant: ["tabular-nums"] },
  apy: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  ven: { position: "absolute", left: -2, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: "#111111", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  hold: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 2 },
  holdL: { fontFamily: font.regular, fontSize: 14 },
  holdV: { fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
});
