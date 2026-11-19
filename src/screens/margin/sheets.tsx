import { type ReactNode, useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { AmountField, hfTone, InfoTip, LevSlider, PctChips } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { hfFmt, levFmt, nf, pct, tokFmt, usd } from "@/format";
import { ACTIVITY, type ChainData, DATA, POOLS_BY, PX, TOK } from "@/sample/data";
import { acct, bisect, mAddDebt, mAddIdle, SAFE_HF, simAcct } from "@/sample/model";
import { nowT } from "@/screens/earn/model";
import { openTransfer } from "@/screens/move/move";
import type { Chain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet, openSheet } from "@/ui/overlay";
import { runTx, type TxSpec } from "@/ui/tx";
import { isAre, type Leg, type LegPlan, type LegRun, names } from "@/ui/legs";
import { solanaDepositAndBorrow } from "@/chain/solana/actions";
import { FlashRepayError, planFlashRepay, resumeFlashRepay, solanaFlashRepay, type FlashControl, type FlashLegState, type FlashPlan, type FlashResult } from "@/chain/solana/flash-repay";
import { refreshAccountSoon } from "@/chain/account-live";
import { inUseWallet } from "@/state/wallets";
import { bioIcon } from "@/state/lock";

/* Borrow more and Flash repay (design margin.js bmBody / frPlan), opened from the account strip's + and lightning buttons. */
const fam = families.margin;
const px = (s: string) => PX[s] ?? 0;
const dec = (s: string) => (TOK[s]?.stable ? 2 : 4);
const fmt = (v: number, s: string) => (v > 0 ? String(Math.floor(v * 10 ** dec(s)) / 10 ** dec(s)) : "");

export const openBorrow = (chain: Chain) => openSheet({ title: "Borrow", content: () => <Borrow chain={chain} /> });
export const openFlash = (chain: Chain) =>
  openSheet({
    title: "Flash repay",
    detents: true,
    startLarge: true,
    content: () => <FlashRepay chain={chain} />,
  });

function Borrow({ chain }: { chain: Chain }) {
  useDataVersion();
  const { colors } = useTheme();
  const d = DATA[chain];
  const list = POOLS_BY[chain].map((p) => p.sym);
  const [sym, setSym] = useState("SOL");
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  const s = list.includes(sym) ? sym : list[0];
  const pool = POOLS_BY[chain].find((p) => p.sym === s)!;
  const borrowApply = (c: ChainData, v: number) => (mAddDebt(c, s, v), mAddIdle(c, s, v));
  const free = Math.max(0, pool.sup - pool.bor);
  const maxSafe = Math.min(
    free,
    bisect((v) => simAcct(chain, (c) => borrowApply(c, v)).borrowHf >= SAFE_HF, free),
  );
  const before = acct(chain);
  const levAt = (v: number) => simAcct(chain, (c) => borrowApply(c, v)).lev;
  const maxLev = maxSafe > 0 ? levAt(maxSafe) : before.lev;
  const x = parseFloat(amt) || 0;
  const after = x > 0 ? simAcct(chain, (c) => borrowApply(c, x)) : before;
  const over = x > maxSafe + 1e-9;
  const go = () => {
    closeSheet();
    setTimeout(
      () =>
        runTx({
          chain,
          fam,
          title: "Review borrow",
          cta: "Borrow",
          legs: [
            {
              l: "You borrow",
              v: tokFmt(x, s),
              s: `${pct(pool.borA)} borrow APY`,
            },
          ],
          rows: [
            ["Health factor", `${hfFmt(before.hf)} → ${hfFmt(after.hf)}`],
            ["Account leverage", `${levFmt(before.lev)} → ${levFmt(after.lev)}`],
            ["Lands in", "Your margin account"],
          ],
          done: {
            title: `Borrowed ${tokFmt(x, s)}`,
            line: "Idle in your margin account, ready to trade or farm",
          },
          send: async () => await solanaDepositAndBorrow({ borrows: [{ sym: s, amount: x }] }),
          apply: () => {
            borrowApply(d, x);
            ACTIVITY[chain].unshift({
              t: nowT(),
              area: "Margin",
              action: "Borrow",
              detail: s,
              amt: tokFmt(x, s),
              usd: x * px(s),
              tx: "",
              sym: s,
            });
          },
        }),
      300,
    );
  };
  return (
    <View style={{ gap: 14, paddingBottom: 4 }}>
      <AmountField
        value={amt}
        onChange={(v) => (setAmt(v), setPct(undefined))}
        sym={s}
        onSym={(t) => (setSym(t), setAmt(""))}
        syms={list}
        meta={(t) => tokFmt(d.wallet[t] ?? 0, t)}
        usdValue={x * px(s)}
        label="Borrow amount"
        bad={over}
        footer={
          <View style={styles.ms}>
            <Text style={[styles.cap, { color: colors.muted }]}>
              Max safe {nf(maxSafe, dec(s))} {s}
            </Text>
            <InfoTip text="The most you can borrow while your health factor stays at or above 1.15 (and the pool has the liquidity)." />
          </View>
        }
      />
      <PctChips value={pctV} onPick={(q) => (setPct(q), setAmt(fmt((maxSafe * q) / 100, s)))} />
      <View style={styles.lh}>
        <Text style={[styles.eb, { color: colors.text }]}>LEVERAGE</Text>
        <InfoTip text="Account leverage: market exposure (volatile collateral, spot positions and perp size) divided by equity." />
        <View style={{ flex: 1 }} />
        <Text style={[styles.cap, { color: colors.muted, fontSize: 14 }]}>{levFmt(before.lev)}</Text>
        <Icon name="arrow_forward" size={14} color="muted" />
        <Text
          style={{
            fontFamily: font.semibold,
            fontSize: 15,
            color: colors.text,
          }}
        >
          {levFmt(after.lev)}
        </Text>
      </View>
      {maxLev > before.lev + 0.01 ? (
        <LevSlider
          label="Target"
          value={Math.max(1, after.lev)}
          max={maxLev}
          cap={Math.max(maxLev, 1.01)}
          marks={[]}
          onChange={(L) => {
            const v = L <= before.lev ? 0 : bisect((b) => levAt(b) <= L, maxSafe);
            setAmt(fmt(v, s));
            setPct(undefined);
          }}
        />
      ) : (
        <Text style={[styles.cap, { color: colors.muted }]}>Borrowing {s} stays idle in the account, so leverage does not change until you trade it.</Text>
      )}
      <Pressable onPress={() => (closeSheet(), setTimeout(openTransfer, 300))} style={[styles.add, { borderColor: colors.borderControl }]} accessibilityRole="button">
        <Icon name="add" size={18} />
        <Text
          style={{
            fontFamily: font.semibold,
            fontSize: 13,
            color: colors.text,
          }}
        >
          Add collateral
        </Text>
      </Pressable>
      <View style={[styles.rows, { backgroundColor: colors.bg }]}>
        {(
          [
            ["Borrow APY", pct(pool.borA), ""],
            ["Health factor", x > 0 ? `${hfFmt(before.hf)} → ${hfFmt(after.hf)}` : hfFmt(before.hf), hfTone(after.hf)],
            [`Available ${s}`, nf((d.margin.avail[s] ?? 0) + x, dec(s)), ""],
          ] as [string, string, string][]
        ).map(([l, v, t], i) => (
          <View key={l} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text style={[styles.cap, { flex: 1, color: colors.muted, fontSize: 14 }]}>{l}</Text>
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 14,
                color: t === "warn" ? colors.warning : t === "neg" ? colors.negative : colors.text,
                fontVariant: ["tabular-nums"],
              }}
            >
              {v}
            </Text>
          </View>
        ))}
      </View>
      {x > 0 && <Button label={over ? "Over the safe limit" : `Borrow ${tokFmt(x, s)}`} fam={fam} disabled={over} onPress={go} />}
    </View>
  );
}

// Flash repay (design frPlan), from the chain: the review is planFlashRepay's real plan (the run re-plans on the fresh chain and builds
// exactly that), signed in one approval (two with Perps positions open: the exact Phoenix withdraw is built after the closes landed).
// No optimistic rewrite of the account: after the run the account is read again and the done words come from the chain.
// Flash repay partial and stopped words, from the leg ids (close:*, phoenix, exit:*, swap:*, repay:*, send:*).
const kindOf = (l: Leg) => l.id.split(":")[0];
function flashPart(ok: Leg[], left: Leg[], failed: Leg[]): [string, string] {
  const later = "so the loans were not repaid yet.";
  const all = [...ok, ...left];
  const closes = all.filter((l) => kindOf(l) === "close"), openC = left.filter((l) => kindOf(l) === "close" && l.phase === "failed");
  const loans = all.filter((l) => kindOf(l) === "repay"), owed = left.filter((l) => kindOf(l) === "repay");
  const f = failed[0] ?? left[0];
  if (!f) return ["Account repaid", ""];
  if (openC.length) return [`Closed ${closes.length - openC.length} of ${closes.length}`, `${names(openC)} ${isAre(openC)} still open on Phoenix, ${later}`];
  const k = kindOf(f);
  if (k === "phoenix") return ["Not repaid yet", `Positions closed. ${f.label} didn't go through, ${later}`];
  if (k === "exit") return ["Not repaid yet", `Phoenix is done. ${f.label} didn't go through, ${later}`];
  if (k === "swap") return ["Not repaid yet", `Everything is closed. ${f.label} didn't go through, ${later}`];
  if (k === "repay") return [`Repaid ${loans.length - owed.length} of ${loans.length} loans`, `Everything is closed. ${names(owed)} ${owed.length === 1 ? "is" : "are"} still owed.`];
  if (k === "send") return ["Account repaid", `All loans repaid. ${f.label} didn't go through; it stays in your margin account.`];
  return ["Not confirmed", `${names(left)} didn't go through.`];
}
function flashStopped(ok: Leg[], left: Leg[]): [string, string] {
  const has = (k: string) => ok.some((l) => kindOf(l) === k);
  const owed = left.filter((l) => kindOf(l) === "repay");
  const loans = [...ok, ...left].filter((l) => kindOf(l) === "repay");
  if (!ok.length) return ["Stopped", "Nothing was closed or repaid."];
  if (owed.length && owed.length === loans.length) return ["Stopped", `${has("exit") || has("swap") ? "Positions closed and turned into cash" : has("phoenix") ? "Positions closed and USDC moved out of Phoenix" : "Positions closed"}. Loans not repaid yet.`];
  if (owed.length) return ["Stopped", `Loans partly repaid: ${names(owed)} still owed.`];
  return ["Account repaid", "Stopped before sending anything to your wallet. It stays in your margin account."];
}

function FlashRepay({ chain }: { chain: Chain }) {
  useDataVersion();
  const { colors } = useTheme();
  const [slip, setSlip] = useState(0.5);
  const [toWallet, setToWallet] = useState(false);
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({});
  const [plan, setPlan] = useState<FlashPlan | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const owner = inUseWallet(chain)?.full;
  useEffect(() => {
    let live = true;
    if (!owner) return;
    planFlashRepay(owner, { toWallet, slippageBps: Math.round(slip * 100) })
      .then((p) => live && (setPlan(p), setErr(null)))
      .catch((e) => live && setErr(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [owner, toWallet, slip]);

  if (!owner) return <Text style={[styles.cap, { color: colors.muted, fontSize: 14, paddingBottom: 12 }]}>Connect a Solana wallet to use Flash repay.</Text>;
  if (err && !plan) return <Text style={[styles.cap, { color: colors.muted, fontSize: 14, paddingBottom: 12 }]}>Could not read your account: {err}</Text>;
  if (!plan) return <Text style={[styles.cap, { color: colors.muted, fontSize: 14, paddingBottom: 12 }]}>Reading your account from the chain…</Text>;
  if (plan.empty) return <Text style={[styles.cap, { color: colors.muted, fontSize: 14, paddingBottom: 12 }]}>Nothing to repay: the account has no loans, positions or Phoenix funds.</Text>;

  const opts = { toWallet, slippageBps: Math.round(slip * 100) };
  const nPos = plan.perps.length + plan.farm.length;
  const costs = plan.costs.phoenixUsd + plan.costs.swapUsd;
  const legPlan: LegPlan = plan.legs.map((l) => ({ id: l.id, label: l.label, noun: l.noun, stage: l.stage, approval: l.approval }));
  const approvalsText = plan.approvals === 1 ? "1 approval" : `${plan.approvals} approvals`;
  const go = () => {
    const done: TxSpec["done"] = { title: "Flash repay finished", line: "Your account was read again from the chain." };
    // The done words come from the chain read after the run (exact amounts).
    const finish = (r: FlashResult) => {
      done.title = r.title;
      done.line = r.line;
      refreshAccountSoon(chain);
      return r.lastSignature;
    };
    const control = (run: LegRun): FlashControl => ({ onStatus: run.onStatus, onLeg: run.onLeg, cancel: run.cancel, stop: run.stop });
    // The last partial result: what a retry continues from (it reads the chain again and sends only what is left).
    let last: FlashRepayError | FlashLegState[] = [];
    // onLegs: the legs were rebuilt (approval 2 after the closes, with exact amounts): the rows follow them
    const remember = (run: LegRun): FlashControl => ({
      ...control(run),
      onLegs: (ls) => {
        if (!(last instanceof FlashRepayError)) last = ls;
        run.onLegs?.(ls);
      },
    });
    const keep = async (p: Promise<FlashResult>) => {
      try {
        return finish(await p);
      } catch (e) {
        if (e instanceof FlashRepayError) last = e;
        throw e;
      }
    };
    closeSheet();
    setTimeout(
      () =>
        runTx({
          chain,
          fam,
          title: "Review flash repay",
          cta: plan.debtUsd > 0 ? `Flash repay ${usd(plan.debtUsd)}` : toWallet ? "Close all and withdraw" : `Close ${nPos} position${nPos === 1 ? "" : "s"}`,
          legs: [
            { l: "Closes", v: `${nPos} position${nPos === 1 ? "" : "s"}`, s: [plan.perps.length && `Perps ${plan.perps.length}`, plan.farm.length && `Farm ${plan.farm.length}`].filter(Boolean).join(", ") || "Idle funds only" },
            { l: "Repays", v: usd(plan.debtUsd), s: plan.loans.map((x) => x.sym).join(", ") || "No loans" },
          ],
          rows: [
            ["Est. costs", usd(costs)],
            [toWallet ? "To your wallet (at least)" : "Left in account", usd(toWallet ? plan.sends.reduce((t, s) => t + s.usd, 0) : plan.leftUsd), "pos"],
            ["Transactions", `${plan.txCount} (${approvalsText})`],
          ],
          done,
          plan: legPlan,
          cancelable: true,
          stoppable: true,
          run: (run) => keep(solanaFlashRepay(opts, remember(run))),
          // Whatever `only` names, the retry reads the chain and builds only the work still there (landed legs are never resent).
          retryLegs: (_only, run) => keep(resumeFlashRepay(last, opts, remember(run))),
          // the whole operation in plain words (design MULTI-LEG.md, Flash repay rows); Retry / Continue resume only what is left
          copy: {
            doing: plan.debtUsd > 0 ? "Repaying your account" : "Closing your positions",
            part: flashPart,
            stopped: flashStopped,
            continueLabel: (left) => (left.some((l) => l.id.startsWith("repay:")) ? "Continue repaying" : "Continue"),
          },
          // Nothing is rewritten here: the account is read again from the chain (refreshAccountSoon) after the run.
          apply: () => {},
        }),
      300,
    );
  };

  const groups = [
    {
      key: "perps",
      title: "Perps on Phoenix",
      logo: "PHX",
      items: [
        ...plan.perps.map((p) => ({ name: `${p.key}-PERP ${p.side}`, sub: `Close on Phoenix, fee ~${usd(p.feeUsd)}`, usdc: p.equityUsd })),
        ...(plan.perps.length === 0 && plan.phoenixUsdc > 0 ? [{ name: "Idle USDC", sub: "Phoenix account", usdc: plan.phoenixUsdc }] : []),
      ],
    },
    { key: "farm", title: "Farm on Kamino", logo: plan.farm[0]?.sym ?? "USDC", items: plan.farm.map((f) => ({ name: `${f.sym} lending`, sub: "Exit Kamino", usdc: f.usd })) },
    {
      key: "spot",
      title: "Swaps on Jupiter",
      logo: plan.swaps[0]?.from ?? "USDC",
      items: plan.swaps.map((s) => ({ name: `${nf(s.inAmount, 4)} ${s.from} to ${s.to}`, sub: `At least ${nf(s.minOut, 4)} ${s.to}`, usdc: s.outUsd })),
    },
  ].filter((g) => g.items.length);
  const costRows = ([["Phoenix fees", plan.costs.phoenixUsd], ["Jupiter swaps", plan.costs.swapUsd]] as [string, number][]).filter(([, v]) => v > 0);
  const line = { borderTopWidth: 1, borderTopColor: colors.divider };
  const sendUsd = plan.sends.reduce((t, s) => t + s.usd, 0);

  return (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <View style={styles.intro}>
        <View style={[styles.bolt, { backgroundColor: colors.purpleTint }]}>
          <Icon name="bolt" size={20} color="#CBB6FA" />
        </View>
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted }}>
          {plan.perpsSecondApproval
            ? "Closes your Perps positions first (one approval), then withdraws from Phoenix, repays every loan and finishes in a second approval: Phoenix only pays out the exact amount left after the closes."
            : `Closes every position, then repays every loan. ${plan.txCount} transaction${plan.txCount === 1 ? "" : "s"}, ${approvalsText}.`}
        </Text>
      </View>
      {plan.blocked && <Text style={[styles.cap, { color: colors.negative, fontSize: 13 }]}>{plan.blocked}</Text>}
      <View style={[styles.grid, { backgroundColor: colors.bg }]}>
        {(
          [
            ["Positions", String(nPos), [plan.perps.length && `Perps ${plan.perps.length}`, plan.farm.length && `Farm ${plan.farm.length}`].filter(Boolean).join(", ") || "Idle funds only"],
            ["Loans", usd(plan.debtUsd), plan.loans.map((x) => x.sym).join(", ") || "None"],
            ["Est. costs", usd(costs), "Fees and price impact"],
            toWallet ? ["To your wallet", usd(sendUsd), `About ${usd(plan.leftUsd)} stays`] : ["Left in account", usd(plan.leftUsd), "As collateral"],
          ] as [string, string, string][]
        ).map(([l, v, s2], i) => (
          <View key={l} style={[styles.cell, i % 2 === 1 && { borderLeftWidth: 1, borderLeftColor: colors.divider }, i > 1 && line]}>
            <Text style={[styles.cap, { color: colors.muted }]}>{l}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text, fontVariant: ["tabular-nums"] }}>{v}</Text>
            <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>
              {s2}
            </Text>
          </View>
        ))}
      </View>

      {groups.length > 0 && (
        <View style={{ gap: 8 }}>
          <Eb t="POSITIONS CLOSED" />
          <Text style={[styles.cap, { color: colors.muted, marginTop: -4 }]}>Tap a venue to see its positions.</Text>
          {groups.map((g) => (
            <View key={g.key} style={[styles.card, { backgroundColor: colors.bg }]}>
              <Pressable
                onPress={() => setUnfolded((u) => ({ ...u, [g.key]: !u[g.key] }))}
                style={styles.gh}
                accessibilityRole="button"
                accessibilityState={{ expanded: !!unfolded[g.key] }}
                accessibilityLabel={`${g.title}, ${g.items.length}`}
              >
                <TokenLogo sym={g.logo} size={20} />
                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: colors.text }}>
                  {g.title}
                  <Text style={{ fontFamily: font.regular, color: colors.muted }}> · {g.items.length}</Text>
                </Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text, fontVariant: ["tabular-nums"] }}>{usd(g.items.reduce((t, x) => t + x.usdc, 0))}</Text>
                <Icon name={unfolded[g.key] ? "expand_less" : "expand_more"} size={20} color="muted" />
              </Pressable>
              {unfolded[g.key] &&
                g.items.map((x) => (
                  <View key={x.name} style={[styles.it, line]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.text }} numberOfLines={1}>
                        {x.name}
                      </Text>
                      <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>
                        {x.sub}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text, fontVariant: ["tabular-nums"] }}>{`${x.usdc >= 0 ? "+" : "−"}${nf(Math.abs(x.usdc), 2)} USD`}</Text>
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}

      {plan.loans.length > 0 && (
        <View style={{ gap: 8 }}>
          <Eb t="LOANS REPAID" />
          <View style={[styles.card, { backgroundColor: colors.bg }]}>
            {plan.loans.map((x, i) => (
              <View key={x.sym} style={[styles.it, i > 0 && line]}>
                <TokenLogo sym={x.sym} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.text, fontVariant: ["tabular-nums"] }}>{tokFmt(x.amount, x.sym)}</Text>
                  <Text style={[styles.cap, { color: colors.muted }]}>{plan.swaps.some((s) => s.to === x.sym) ? "Partly from a swap" : "Paid from the same token"}</Text>
                </View>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text, fontVariant: ["tabular-nums"] }}>{usd(x.usd)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {plan.untouched.length > 0 && (
        <Text style={[styles.cap, { color: colors.muted }]}>
          Not moved by Flash repay: {plan.untouched.map((u) => `${u.name} (${usd(u.usd)})`).join(", ")}.
        </Text>
      )}

      <View style={[styles.card, { backgroundColor: colors.bg, paddingTop: 6, paddingBottom: 2 }]}>
        <Eb t="COSTS" tip="Phoenix taker fees to close perps at the current mark, and the swaps' cost against the oracle price (quoted now)." />
        {costRows.map(([l, v], i) => (
          <Pr key={l} l={l} first={i === 0}>
            <V v={usd(v)} />
          </Pr>
        ))}
        <Pr
          l="Transactions"
          tip="Signed together and sent in stages: each stage waits for the one before. If a step fails, nothing after it is sent and you can retry only what is left."
          first={!costRows.length}
        >
          <V v={`${plan.txCount} · ${approvalsText}`} />
        </Pr>
        <Pr l="Max slippage" tip="Perp closes and swaps that would fill worse than this are not executed.">
          <View style={[styles.seg, { backgroundColor: colors.segment }]} accessibilityRole="tablist" accessibilityLabel="Max slippage">
            {[0.1, 0.5, 1].map((v) => (
              <Pressable key={v} onPress={() => setSlip(v)} style={[styles.sc, slip === v && { backgroundColor: colors.segmentActive }]} accessibilityRole="tab" accessibilityState={{ selected: slip === v }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: slip === v ? colors.text : colors.muted }}>{v}%</Text>
              </Pressable>
            ))}
          </View>
        </Pr>
      </View>

      <Pressable onPress={() => setToWallet(!toWallet)} style={styles.tgr} accessibilityRole="switch" accessibilityState={{ checked: toWallet }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.text }}>Also withdraw to wallet</Text>
          <Text style={[styles.cap, { color: colors.muted }]}>After repaying, send what is left to your wallet</Text>
        </View>
        <Switch value={toWallet} onValueChange={setToWallet} trackColor={{ true: fam.n[0], false: colors.disabled }} thumbColor="#FFFFFF" accessibilityLabel="Also withdraw to wallet" />
      </Pressable>
      <Button
        label={
          plan.blocked
            ? "Cannot repay yet"
            : plan.loans.length
              ? `${toWallet ? "Flash repay and withdraw" : "Flash repay"} ${usd(plan.debtUsd)}`
              : toWallet
                ? "Close all and withdraw"
                : `Close ${nPos} position${nPos === 1 ? "" : "s"}`
        }
        fam={fam}
        icon={bioIcon()}
        disabled={!!plan.blocked}
        onPress={go}
      />
    </View>
  );
}

// Flash repay pieces: an eyebrow (with optional tip), a label / value row, and a value.
function Eb({ t, tip }: { t: string; tip?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.ebRow}>
      <Text style={[styles.eb, { color: colors.muted }]}>{t}</Text>
      {tip && <InfoTip text={tip} />}
    </View>
  );
}
function Pr({ l, tip, children, first }: { l: string; tip?: string; children: ReactNode; first?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pr, !first && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
      <Text style={[styles.cap, { color: colors.muted, fontSize: 14 }]}>{l}</Text>
      {tip && <InfoTip text={tip} />}
      <View style={{ flex: 1 }} />
      {children}
    </View>
  );
}
function V({ v }: { v: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] }}>{v}</Text>;
}

const styles = StyleSheet.create({
  cap: {
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ["tabular-nums"],
  },
  eb: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6 },
  ms: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
    marginTop: 4,
  },
  lh: { flexDirection: "row", alignItems: "center", gap: 6 },
  add: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  rows: { borderRadius: 12, paddingHorizontal: 12 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: 8 },
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  bolt: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    overflow: "hidden",
  },
  card: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 2 },
  ebRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  pr: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  seg: {
    flexDirection: "row",
    gap: 2,
    padding: 3,
    borderRadius: 20,
    marginRight: -3,
  },
  tgr: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
  cell: { width: "50%", padding: 12, gap: 2 },
  gh: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
  it: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 },
  sc: {
    minWidth: 52,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
