import { perpMark } from "@/chain/perp-mark";
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { AmountField, hfTone, InfoTip, LevSlider, PctChips } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { hfFmt, levFmt, nf, pct, tokFmt, usd } from "@/format";
import { ACTIVITY, type ChainData, DATA, POOLS_BY, PX, TOK } from "@/sample/data";
import { acct, bisect, mAddDebt, mAddIdle, perpPnl, perpQty, SAFE_HF, simAcct } from "@/sample/model";
import { nowT, randTx } from "@/screens/earn/model";
import { openTransfer } from "@/screens/move/move";
import type { Chain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet, openSheet } from "@/ui/overlay";
import { runTx } from "@/ui/tx";
import { stellarBorrow, stellarFlashRepay } from "@/chain/stellar/actions";
import { solanaDepositAndBorrow, solanaFlashRepay } from "@/chain/solana/actions";
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
  const [sym, setSym] = useState(chain === "solana" ? "SOL" : "XLM");
  const [amt, setAmt] = useState("");
  const [pctV, setPct] = useState<number | undefined>();
  const s = list.includes(sym) ? sym : list[0];
  const pool = POOLS_BY[chain].find((p) => p.sym === s)!;
  const borrowApply = (c: ChainData, v: number) => (mAddDebt(c, s, v), mAddIdle(c, s, v));
  const free = Math.max(0, pool.sup - pool.bor);
  const maxSafe = Math.min(
    free,
    bisect((v) => simAcct(chain, (c) => borrowApply(c, v)).hf >= SAFE_HF, free),
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
          send: async () =>
            chain === "stellar"
              ? await stellarBorrow(s, x)
              : await solanaDepositAndBorrow({ borrows: [{ sym: s, amount: x }] }),
          apply: () => {
            borrowApply(d, x);
            ACTIVITY[chain].unshift({
              t: nowT(),
              area: "Margin",
              action: "Borrow",
              detail: s,
              amt: tokFmt(x, s),
              usd: x * px(s),
              tx: randTx(),
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
        meta={(t) => `${pct(POOLS_BY[chain].find((p) => p.sym === t)?.borA ?? 0)} APY`}
        usdValue={TOK[s]?.stable ? undefined : x * px(s)}
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

// Flash repay (design frPlan): closes every position to USDC, repays every loan, keeps the collateral; costs and slippage up front.
const FEES = { perp: 0.00035, swap: 0.0003, vaultExit: 0.0005 };
function FlashRepay({ chain }: { chain: Chain }) {
  useDataVersion();
  const { colors } = useTheme();
  const d = DATA[chain];
  const [slip, setSlip] = useState(0.5);
  const [toWallet, setToWallet] = useState(false);
  // venue cards start folded to one line (venue, count, total); tap to see the positions
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({});
  const a = acct(chain);
  const perps = d.perps.map((p) => ({
    name: `${p.k}-PERP ${p.side}`,
    sub: `${nf(p.lev, 2)}x on Phoenix`,
    usdc: p.coll + perpPnl(p) - perpQty(p) * perpMark(p.k) * FEES.perp,
    fee: perpQty(p) * perpMark(p.k) * FEES.perp,
  }));
  const farm = d.farm.map((f) => ({
    name: f.name,
    sub: f.kind === "dn" ? "Delta-neutral vault" : `${f.venue} lending`,
    usdc: (f.amt + f.earned) * (PX[f.sym] ?? 1),
    fee: f.kind === "dn" ? (f.amt + f.earned) * FEES.vaultExit : 0,
  }));
  const spot = d.spot.map((s) =>
    s.side === "long"
      ? {
          name: `${s.sym} long`,
          sub: `Sell on ${chain === "solana" ? "Jupiter" : "Soroswap"}`,
          out: `+${nf(s.qty * px(s.sym) * (1 - FEES.swap), 2)} USDC`,
          usdc: s.qty * px(s.sym) * (1 - FEES.swap),
          fee: s.qty * px(s.sym) * FEES.swap,
        }
      : {
          name: `${s.sym} short`,
          sub: `Buy back on ${chain === "solana" ? "Jupiter" : "Soroswap"}`,
          out: `+${nf(s.qty, 2)} ${s.sym}`,
          usdc: s.qty * s.entry - s.qty * px(s.sym) * (1 + FEES.swap),
          fee: s.qty * px(s.sym) * FEES.swap,
        },
  );
  const idle = Object.entries(d.margin.avail).reduce((t, [k, v]) => t + v * (PX[k] ?? 1), 0) + d.phoenixIdle;
  const debtUsd = d.margin.debt.reduce((t, x) => t + x.amt * px(x.sym), 0);
  const costs = [...perps, ...farm, ...spot].reduce((t, x) => t + x.fee, 0);
  const proceeds = [...perps, ...farm, ...spot].reduce((t, x) => t + x.usdc, 0) + idle;
  const left = a.collUsd + proceeds - debtUsd;
  const keep = left - proceeds * (slip / 100);
  const nPos = perps.length + farm.length + spot.length;
  const txs = nPos + d.margin.debt.length + (toWallet ? 1 : 0) + 1;
  if (!debtUsd && !nPos)
    return <Text style={[styles.cap, { color: colors.muted, fontSize: 14, paddingBottom: 12 }]}>Nothing to repay: the account has no loans or positions.</Text>;

  const go = () => {
    closeSheet();
    setTimeout(
      () =>
        runTx({
          chain,
          fam,
          title: "Review flash repay",
          cta: `Flash repay ${usd(debtUsd)}`,
          legs: [
            {
              l: "Closes",
              v: `${nPos} position${nPos === 1 ? "" : "s"}`,
              s: "Perps, farm and spot",
            },
            {
              l: "Repays",
              v: usd(debtUsd),
              s: d.margin.debt.map((x) => x.sym).join(", "),
            },
          ],
          rows: [
            ["Est. costs", usd(costs)],
            ["You keep at least", usd(keep), "pos"],
            ["Transactions", `~${txs}`],
          ],
          done: {
            title: "Account repaid",
            line: toWallet ? `${usd(left)} sent to your wallet` : `${usd(left)} left as collateral`,
          },
          send: async () => {
            if (chain === "stellar") {
              let lastHash = "";
              const colSym = d.margin.coll[0]?.sym ?? "XLM";
              for (const row of d.margin.debt) {
                if (row.amt > 0) {
                  lastHash = await (stellarFlashRepay as any)(row.sym, row.amt, colSym, slip);
                }
              }
              return lastHash;
            }
            const sigs = await solanaFlashRepay({ slippageBps: Math.round(slip * 100) });
            return sigs[sigs.length - 1] ?? "";
          },
          apply: () => {
            const usdc = proceeds - debtUsd;
            d.perps = [];
            d.farm = [];
            d.spot = [];
            d.phoenixIdle = 0;
            d.margin.debt = [];
            d.margin.avail = {};
            const stable = chain === "solana" ? "USDC" : "SoUSDC";
            if (toWallet) {
              d.wallet[stable] = (d.wallet[stable] ?? 0) + Math.max(0, usdc);
              d.margin.coll.forEach((c) => (d.wallet[c.sym] = (d.wallet[c.sym] ?? 0) + c.amt));
              d.margin.coll = [];
            } else d.margin.avail[stable] = Math.max(0, usdc);
            ACTIVITY[chain].unshift({
              t: nowT(),
              area: "Margin",
              action: "Repay",
              detail: "Flash repay: every loan",
              amt: usd(debtUsd),
              usd: -debtUsd,
              tx: randTx(),
              sym: stable,
            });
          },
        }),
      300,
    );
  };

  const swapV = chain === "solana" ? "Jupiter" : "Soroswap";
  const groups = [
    {
      key: "perps",
      title: "Perps on Phoenix",
      logo: "PHX",
      items: [
        ...perps,
        ...(d.phoenixIdle > 0
          ? [
              {
                name: "Idle USDC",
                sub: "Phoenix account",
                usdc: d.phoenixIdle,
                fee: 0,
              },
            ]
          : []),
      ],
    },
    {
      key: "farm",
      title: `Farm on ${d.farm[0]?.venue.split(" ")[0] ?? "Kamino"}`,
      logo: d.farm[0]?.sym ?? "USDC",
      items: farm,
    },
    {
      key: "spot",
      title: `Spot on ${swapV}`,
      logo: d.spot[0]?.sym ?? "USDC",
      items: spot,
    },
  ].filter((g) => g.items.length);
  const costRows = (
    [
      ["Phoenix fees (0.035%)", perps.reduce((t, x) => t + x.fee, 0)],
      [`${swapV} swaps (0.03%)`, spot.reduce((t, x) => t + x.fee, 0)],
      ["Vault exit (0.05%)", farm.reduce((t, x) => t + x.fee, 0)],
    ] as [string, number][]
  ).filter(([, v]) => v > 0);
  const line = { borderTopWidth: 1, borderTopColor: colors.divider };

  return (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <View style={styles.intro}>
        <View style={[styles.bolt, { backgroundColor: colors.purpleTint }]}>
          <Icon name="bolt" size={20} color="#CBB6FA" />
        </View>
        <Text
          style={{
            flex: 1,
            fontFamily: font.regular,
            fontSize: 13,
            lineHeight: 18,
            color: colors.muted,
          }}
        >
          Closes every position, then repays every loan. One approval per step.
        </Text>
      </View>
      <View style={[styles.grid, { backgroundColor: colors.bg }]}>
        {(
          [
            [
              "Positions",
              String(nPos),
              [perps.length && `Perps ${perps.length}`, farm.length && `Farm ${farm.length}`, spot.length && `Spot ${spot.length}`].filter(Boolean).join(", ") ||
                "Idle funds only",
            ],
            ["Loans", usd(debtUsd), d.margin.debt.map((x) => x.sym).join(", ") || "None"],
            ["Est. costs", usd(costs), "Fees and price impact"],
            [toWallet ? "To your wallet" : "Left in account", usd(left), toWallet ? "After repaying" : "As collateral"],
          ] as [string, string, string][]
        ).map(([l, v, s2], i) => (
          <View
            key={l}
            style={[
              styles.cell,
              i % 2 === 1 && {
                borderLeftWidth: 1,
                borderLeftColor: colors.divider,
              },
              i > 1 && line,
            ]}
          >
            <Text style={[styles.cap, { color: colors.muted }]}>{l}</Text>
            <Text
              style={{
                fontFamily: font.semibold,
                fontSize: 16,
                color: colors.text,
                fontVariant: ["tabular-nums"],
              }}
            >
              {v}
            </Text>
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
                accessibilityLabel={`${g.title}, ${g.items.length} ${g.items.length === 1 ? "position" : "positions"}`}
              >
                <TokenLogo sym={g.logo} size={20} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: font.semibold,
                    fontSize: 13,
                    color: colors.text,
                  }}
                >
                  {g.title}
                  <Text style={{ fontFamily: font.regular, color: colors.muted }}> · {g.items.length}</Text>
                </Text>
                <Text
                  style={{
                    fontFamily: font.semibold,
                    fontSize: 13,
                    color: colors.text,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {usd(g.items.reduce((t, x) => t + x.usdc, 0))}
                </Text>
                <Icon name={unfolded[g.key] ? "expand_less" : "expand_more"} size={20} color="muted" />
              </Pressable>
              {unfolded[g.key] && g.items.map((x) => (
                <View key={x.name} style={[styles.it, line]}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: font.semibold,
                        fontSize: 14,
                        lineHeight: 20,
                        color: colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {x.name}
                    </Text>
                    <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>
                      {x.sub}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: font.semibold,
                      fontSize: 13,
                      color: colors.text,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {"out" in x && typeof x.out === "string" ? x.out : `${x.usdc >= 0 ? "+" : "−"}${nf(Math.abs(x.usdc), 2)} USDC`}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {d.margin.debt.length > 0 && (
        <View style={{ gap: 8 }}>
          <Eb t="LOANS REPAID" />
          <View style={[styles.card, { backgroundColor: colors.bg }]}>
            {d.margin.debt.map((x, i) => (
              <View key={x.sym} style={[styles.it, i > 0 && line]}>
                <TokenLogo sym={x.sym} size={28} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: font.semibold,
                      fontSize: 14,
                      lineHeight: 20,
                      color: colors.text,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {tokFmt(x.amt, x.sym)}
                  </Text>
                  <Text style={[styles.cap, { color: colors.muted }]}>Paid from the same token</Text>
                </View>
                <Text
                  style={{
                    fontFamily: font.semibold,
                    fontSize: 13,
                    color: colors.text,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {usd(x.amt * px(x.sym))}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.bg, paddingTop: 6, paddingBottom: 2 }]}>
        <Eb t="COSTS" tip="Phoenix taker fees to close perps, swap cost (quote vs oracle price) and the delta-neutral vault exit fee, at sample rates." />
        {costRows.map(([l, v], i) => (
          <Pr key={l} l={l} first={i === 0}>
            <V v={usd(v)} />
          </Pr>
        ))}
        <Pr
          l="Transactions"
          tip="Flash repay runs step by step: each transaction needs its own approval. If one fails, the run stops and you can retry from there."
          first={!costRows.length}
        >
          <V v={`~${txs}`} />
        </Pr>
        <Pr l="Max slippage" tip="Swaps and perp closes that would fill worse than this are not executed.">
          <View style={[styles.seg, { backgroundColor: colors.segment }]} accessibilityRole="tablist" accessibilityLabel="Max slippage">
            {[0.1, 0.5, 1].map((v) => (
              <Pressable
                key={v}
                onPress={() => setSlip(v)}
                style={[styles.sc, slip === v && { backgroundColor: colors.segmentActive }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: slip === v }}
              >
                <Text
                  style={{
                    fontFamily: font.semibold,
                    fontSize: 13,
                    color: slip === v ? colors.text : colors.muted,
                  }}
                >
                  {v}%
                </Text>
              </Pressable>
            ))}
          </View>
        </Pr>
        <Pr l="You keep at least">
          <V v={usd(keep)} />
        </Pr>
      </View>

      <Pressable onPress={() => setToWallet(!toWallet)} style={styles.tgr} accessibilityRole="switch" accessibilityState={{ checked: toWallet }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontFamily: font.semibold,
              fontSize: 14,
              lineHeight: 20,
              color: colors.text,
            }}
          >
            Also withdraw to wallet
          </Text>
          <Text style={[styles.cap, { color: colors.muted }]}>After repaying, send what is left to your wallet</Text>
        </View>
        <Switch
          value={toWallet}
          onValueChange={setToWallet}
          trackColor={{ true: fam.n[0], false: colors.disabled }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Also withdraw to wallet"
        />
      </Pressable>
      <Button
        label={
          d.margin.debt.length
            ? `${toWallet ? "Flash repay and withdraw" : "Flash repay"} ${usd(debtUsd)}`
            : toWallet
              ? "Close all and withdraw"
              : `Close ${nPos} position${nPos === 1 ? "" : "s"}`
        }
        fam={fam}
        icon={bioIcon()}
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
