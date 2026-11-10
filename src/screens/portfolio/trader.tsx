import { router } from "expo-router";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { VannaMark } from "@/components/brand";
import { Chart, curve } from "@/components/chart";
import { InfoTip } from "@/components/form";
import { HistoryList } from "@/components/history";
import { PillTabs, SubTabs, Swap } from "@/components/motion";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, Tag, TokenBadge } from "@/components/ui/kit";
import { nf, pct, sign, spct, sUsd, usd } from "@/format";
import { ACTIVITY, DATA } from "@/sample/data";
import { acct, farmPositions, hasMargin, lossBuffer, type Position, perpPositions, portfolioTotals, priceOf, priceRoom, spotPositions } from "@/sample/model";
import { useChain } from "@/state/chain";
import { usePersonal } from "@/state/personal";
import { useTheme } from "@/theme/use-theme";
import { brand, families, font } from "@/theme/tokens";
import { closeSheet, toast } from "@/ui/overlay";

import { openFlash } from "@/screens/margin/sheets";

import { SumCard } from "./lender";
import { type TraderSub, usePfColors } from "./shared";
import { openShare } from "@/screens/share/share";

const AREA: Record<TraderSub, string> = { margin: "Margin", spot: "Spot", perps: "Perps", farm: "Farm" };

// Trader (portfolio.js trader): Margin | Spot | Perps (Solana) | Farm.
export function Trader({ sub, setSub }: { sub: TraderSub; setSub: (s: TraderSub) => void }) {
  const { chain } = useChain();
  const items: [TraderSub, string][] = [["margin", "Margin"], ["spot", "Spot"], ...(chain === "solana" ? [["perps", "Perps"] as [TraderSub, string]] : []), ["farm", "Farm"]];
  const current = items.some(([k]) => k === sub) ? sub : "margin";

  return (
    <View style={{ gap: 12 }}>
      <PillTabs items={items} value={current} onChange={setSub} color={families.portfolio.tab} />
      <Swap k={current}>
        <View style={{ gap: 12 }}>{current === "margin" ? <MarginBody /> : <PositionsBody sub={current} />}</View>
      </Swap>
    </View>
  );
}

// Label-left / value-right rows (the design's pairs as rows), an info line per explained figure.
function InfoRows({ rows }: { rows: { label: string; value: string; tone?: string; tip?: string }[] }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View style={[styles.rows, { backgroundColor: colors.bg }]}>
      {rows.map((r, i) => (
        <View key={r.label} style={i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>{r.label}</Text>
            {r.tip && (
              <Pressable onPress={() => setOpen(open === r.label ? null : r.label)} hitSlop={10} accessibilityRole="button" accessibilityLabel={r.tip}>
                <Icon name="info" size={16} color="muted" />
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Text style={[styles.infoValue, { color: r.tone === "neg" ? colors.negative : r.tone === "warn" ? colors.warning : colors.text }]}>{r.value}</Text>
          </View>
          {open === r.label && <Text style={[styles.tip, { color: colors.muted }]}>{r.tip}</Text>}
        </View>
      ))}
    </View>
  );
}

function MarginBody() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"cur" | "hist">("cur");
  const ready = usePersonal(chain);
  const d = DATA[chain];
  if (!ready || !hasMargin(d)) return <EmptyCard title="No margin account yet" action="Open Margin" onAction={() => router.navigate("/margin")} module="margin" />;

  const a = acct(chain);
  const noDebt = !(a.debtUsd > 0.005);
  const r = priceRoom(chain);
  const room = r.state === "ok" ? `${(r.pct ?? 0) < 0 ? "−" : "+"}${nf(Math.abs(r.pct ?? 0), 1)}%` : r.state === "now" ? "Liquidatable now" : r.state === "nodebt" ? "No debt" : "None";
  const roomTone = r.state === "now" ? "neg" : r.state === "ok" && Math.abs(r.pct ?? 0) < 10 ? "warn" : "";
  // the design's account Net P&L: trading earnings (open P&L, realized, farm) less the interest paid
  const net = portfolioTotals(chain).earnTrade - d.margin.interestPaid;
  const since = (d.margin.created ?? "").split(",")[0];
  const hist = ACTIVITY[chain].filter((x) => x.area === "Margin");

  return (
    <>
      <Card>
        <InfoRows
          rows={[
            { label: "Collateral", value: usd(a.collUsd) },
            { label: "Loss buffer", value: noDebt ? "No debt" : usd(lossBuffer(chain)), tip: "Value the account can lose before the health factor reaches 1.10." },
            { label: "Price room", value: room, tone: roomTone, tip: "How far all collateral prices can fall together before the health factor reaches 1.10." },
            { label: "Margin ratio", value: pct(a.assets > 0 ? (a.debtUsd / a.assets) * 100 : 0, 1) },
          ]}
        />
      </Card>
      <SumCard
        k="Net P&L"
        v={sUsd(net)}
        tone={sign(net)}
        range={`Since ${since}`}
        pairs={[]}
        chart={<Chart pts={curve(net, 4, 41)} color={colors.link} x={[since, "Sep 28", "Oct 7"]} label="Net P&L since the account opened" />}
      />
      <SubTabs items={[["cur", "Current"], ["hist", "History", hist.length]]} value={tab} onChange={setTab} fam={families.portfolio} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>{tab === "hist" ? <HistoryList rows={hist} module="margin" /> : <AccountMap />}</View>
      </Swap>
    </>
  );
}

function Section({ label, count }: { label: string; count: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={[styles.section, { color: colors.text, marginTop: 0 }]}>{label}</Text>
      <View style={[styles.badge, { backgroundColor: colors.segment }]}>
        <Text style={{ fontFamily: font.semibold, fontSize: 11, color: colors.text }}>{count}</Text>
      </View>
    </View>
  );
}
function Link() {
  const { colors } = useTheme();
  return (
    <View style={styles.link} aria-hidden>
      <View style={[styles.linkLine, { backgroundColor: colors.borderControl }]} />
      <View style={[styles.linkDot, { backgroundColor: "#BDA4F4" }]} />
    </View>
  );
}

// The account map in list form (design shared/acctmap.js, compact): actions, collateral, the account value card (brand-gradient rim),
// borrowed with Repay, then where the borrowed funds are. A connector line and dot join the three blocks. inSheet = no title row.
export function AccountMap({ inSheet, onRepay }: { inSheet?: boolean; onRepay?: (sym: string) => void }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const d = DATA[chain];
  const a = acct(chain);
  const net = portfolioTotals(chain).earnTrade - d.margin.interestPaid;
  const used: [string, number, TraderSub | null][] = (
    [["Spot", a.spotUsd, "spot"], ["Perps", chain === "solana" ? a.perpEq : 0, "perps"], ["Farm", a.farmUsd, "farm"], ["Idle", a.availUsd, null]] as [string, number, TraderSub | null][]
  ).filter((p) => p[1] > 0.005);
  const body = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
        {!inSheet && <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 18, color: colors.text }}>Account</Text>}
        {inSheet && <View style={{ flex: 1 }} />}
        <IconAction icon="add" label="Deposit collateral" tone="surface" onPress={() => router.navigate("/margin")} />
        <IconAction icon="bolt" label="Flash repay" tone="primary" gradient={["#B6479E", "#8E3784"]} onPress={() => (closeSheet(), setTimeout(() => openFlash(chain), 300))} />
        <IconAction icon={shareIcon} label="Share account" tone="plain" onPress={() => (inSheet && closeSheet(), setTimeout(() => openShare({ kind: "margin" }), inSheet ? 300 : 0))} />
      </View>
      <Section label="COLLATERAL" count={d.margin.coll.length} />
      <View style={[styles.group, { backgroundColor: colors.bg }]}>
        {d.margin.coll.map((c) => (
          <AssetRow key={c.sym} sym={c.sym} amt={c.amt} />
        ))}
      </View>
      <Link />
      <View style={styles.valueWrap}>
        <LinearGradient colors={["#FC5457", "#B6479E", "#703AE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
        <View style={[styles.value, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <VannaMark size={16} />
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.text }}>Account value</Text>
            <InfoTip text="Everything the margin account holds: collateral, idle funds and the value of its positions." />
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 26, color: colors.text, fontVariant: ["tabular-nums"] }}>{usd(a.assets)}</Text>
          {(
            [
              ["Interest accrued", usd(d.margin.interestPaid), "", "Interest the loans have built up so far."],
              ["Borrow rate", pct(a.borrowApy), "", "The yearly rate on what the account owes, weighted by loan size."],
              ["Net P&L", sUsd(net), sign(net), "Trading earnings (open and closed positions, farm) less the interest paid."],
            ] as [string, string, string, string][]
          ).map(([l, v, t, tip]) => (
            <View key={l} style={styles.vr}>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.text }}>{l}</Text>
              <InfoTip text={tip} />
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t === "pos" ? colors.positive : t === "neg" ? colors.negative : colors.text, fontVariant: ["tabular-nums"] }}>{v}</Text>
            </View>
          ))}
        </View>
      </View>
      <Link />
      <Section label="BORROWED" count={d.margin.debt.length} />
      <View style={[styles.group, { backgroundColor: colors.bg }]}>
        {d.margin.debt.map((x) => (
          <AssetRow key={x.sym} sym={x.sym} amt={x.amt} action="Repay" onAction={() => (onRepay ? onRepay(x.sym) : router.navigate("/margin"))} />
        ))}
      </View>
      <View style={[styles.hr, { backgroundColor: colors.divider }]} />
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.text }}>Borrowed funds in</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {used.map(([label, v, sub]) => (
          <Pressable
            key={label}
            onPress={sub ? () => (closeSheet(), router.navigate(sub === "farm" ? "/farm" : "/trade")) : undefined}
            style={[styles.chip, { borderColor: colors.border }]}
            accessibilityRole={sub ? "button" : undefined}
          >
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.muted }}>{label}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>{usd(v)}</Text>
            {sub ? <Icon name="chevron_right" size={16} color="muted" /> : <InfoTip text="Borrowed funds sitting idle in the account, not in any position." />}
          </Pressable>
        ))}
      </View>
    </>
  );
  return inSheet ? <View style={{ gap: 10 }}>{body}</View> : <Card>{body}</Card>;
}

function AssetRow({ sym, amt, action, onAction }: { sym: string; amt: number; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.asset}>
      <TokenBadge sym={sym} size={32} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.assetAmt, { color: colors.text }]}>{nf(amt, 2)}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted }}>{sym}</Text>
      </View>
      <Text style={[styles.assetAmt, { color: colors.text }]}>{usd(amt * priceOf(sym))}</Text>
      {action && (
        <Pressable onPress={onAction} style={[styles.smallBtn, { borderColor: colors.borderControl }]} accessibilityRole="button" accessibilityLabel={`${action} ${sym}`}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function PositionsBody({ sub }: { sub: TraderSub }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const C = usePfColors();
  const [tab, setTab] = useState<"cur" | "hist">("cur");
  const ready = usePersonal(chain);
  const list: Position[] = !ready ? [] : sub === "spot" ? spotPositions(chain) : sub === "perps" ? perpPositions(chain) : farmPositions(chain);
  const hist = ready ? ACTIVITY[chain].filter((x) => x.area === AREA[sub]) : [];
  const pnl = list.reduce((t, p) => t + p.pnl, 0);
  const to = sub === "farm" ? "/farm" : "/trade";

  return (
    <>
      <SumCard
        k={sub === "farm" ? "Earned" : "Open P&L"}
        v={ready ? sUsd(pnl) : "—"}
        tone={sign(pnl)}
        range="30D"
        pairs={[{ label: sub === "farm" ? "Deposited" : "Size", value: usd(list.reduce((t, p) => t + p.size, 0)) }, { label: "Positions", value: String(list.length) }]}
        chart={<Chart pts={curve(pnl, sub.length)} color={sub === "farm" ? colors.positive : colors.link} label={`${AREA[sub]} P&L, last 30 days`} />}
      />
      <SubTabs items={[["cur", "Current", list.length], ["hist", "History", hist.length]]} value={tab} onChange={setTab} fam={families.portfolio} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>
          {tab === "hist" ? (
            <HistoryList rows={hist} module={sub === "farm" ? "farm" : "trade"} />
          ) : !list.length ? (
            <EmptyCard title="No open positions" action={sub === "farm" ? "Browse vaults" : "Start trading"} onAction={() => router.navigate(to)} module={sub === "farm" ? "farm" : "trade"} />
          ) : (
            list.map((p) => (
              <Card key={p.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <TokenBadge sym={p.sym} size={40} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>{p.name}</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {p.tags.map((t) => (
                        <Tag key={t.label} {...t} />
                      ))}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 16, color: sign(p.pnl) === "neg" ? C.neg : C.pos }}>{sUsd(p.pnl)}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: sign(p.pnl) === "neg" ? C.neg : C.pos }}>{spct(p.pct)}</Text>
                  </View>
                </View>
                <Pairs items={[{ label: sub === "farm" ? "Value" : "Size", value: usd(p.size) }]} />
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <IconAction icon="close" label={`Close ${p.name}`} tone="neg" onPress={() => router.navigate(to)} />
                  <IconAction icon={shareIcon} label={`Share ${p.name}`} onPress={() => openShare({ kind: p.sub, id: p.id })} />
                </View>
              </Card>
            ))
          )}
        </View>
      </Swap>
    </>
  );
}

const styles = StyleSheet.create({
  rows: { borderRadius: 12, paddingHorizontal: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  infoLabel: { fontFamily: font.regular, fontSize: 14 },
  infoValue: { fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  tip: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, paddingBottom: 10 },
  section: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.4, marginTop: 4 },
  group: { borderRadius: 12, paddingHorizontal: 12 },
  valueWrap: { borderRadius: 16, padding: 1.5 },
  value: { borderRadius: 14.5, padding: 14, gap: 8 },
  vr: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 28 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  link: { alignItems: "center", height: 18, marginVertical: -4 },
  linkLine: { width: 1, flex: 1 },
  linkDot: { width: 6, height: 6, borderRadius: 3 },
  hr: { height: 1, marginVertical: 4 },
  asset: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
  assetAmt: { fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  smallBtn: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1 },
});
