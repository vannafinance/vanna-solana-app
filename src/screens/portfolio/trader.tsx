import { type Href, router } from "expo-router";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { VannaMark } from "@/components/brand";
import { Chart } from "@/components/chart";
import { InfoTip } from "@/components/form";
import { HistoryList } from "@/components/history";
import { PillTabs, SubTabs, Swap } from "@/components/motion";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, Tag, TokenBadge } from "@/components/ui/kit";
import { nf, pct, sign, spct, sUsd, tokFmt, usd } from "@/format";
import { perpMark } from "@/chain/perp-mark";
import { ACTIVITY, DATA, PERP_HIST, type PerpPos } from "@/sample/data";
import { acct, farmPositions, hasMargin, liqPriceOf, lossBuffer, marginPnl, type Position, perpPnl, perpQty, portfolioTotals, priceOf, priceRoom, spotPositions } from "@/sample/model";
import { CloseAllBar, closePosition, levTag, liqFor, priceFmt } from "@/screens/trade/perps";
import { useChain } from "@/state/chain";
import { useAccountRead } from "@/chain/account-live";
import { usePersonal } from "@/state/personal";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { closeSheet } from "@/ui/overlay";

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
        <View style={{ gap: 12 }}>{current === "margin" ? <MarginBody /> : current === "perps" ? <PerpsBody /> : <PositionsBody sub={current} />}</View>
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
  const read = useAccountRead(chain);
  const d = DATA[chain];
  if (ready && read !== "ready") return <EmptyCard title="" module="margin" />;
  if (!ready || !hasMargin(d)) return <EmptyCard title="No margin account yet" action="Open Margin" onAction={() => router.navigate("/margin")} module="margin" />;

  const a = acct(chain);
  const noDebt = !(a.debtUsd > 0.005);
  const r = priceRoom(chain);
  const room = r.state === "ok" ? `${(r.pct ?? 0) < 0 ? "−" : "+"}${nf(Math.abs(r.pct ?? 0), 1)}%` : r.state === "now" ? "Liquidatable now" : r.state === "nodebt" ? "No debt" : "None";
  const roomTone = r.state === "now" ? "neg" : r.state === "ok" && Math.abs(r.pct ?? 0) < 10 ? "warn" : "";
  // Net P&L: account value now less net deposits at their own time's prices (trading, farm and interest are inside it); one figure, see marginPnl
  const pnl = marginPnl(chain);
  const net = pnl.value;
  const netKnown = pnl.known;
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
        v={netKnown ? sUsd(net) : "—"}
        tone={netKnown ? sign(net) : undefined}
        range={`Since ${since}`}
        pairs={[]}
        chart={<Chart pts={netKnown ? pnl.pts : []} color={colors.link} x={[since, "", "Now"]} label="Net P&L since the account opened" />}
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
  const T0 = portfolioTotals(chain);
  const pnlNow = marginPnl(chain);
  const net = pnlNow.value;
  const netKnown = pnlNow.known;
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
              ["Interest accrued", T0.interestKnown ? usd(d.margin.interestPaid) : "—", "", "Interest the loans have built up so far."],
              ["Borrow rate", pct(a.borrowApy), "", "The yearly rate on what the account owes, weighted by loan size."],
              ["Net P&L", netKnown ? sUsd(net) : "—", netKnown ? sign(net) : "", "What the account is worth now less what you put in (each deposit at its own time's price). Trading, farm earnings and interest are included."],
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
  const personal = usePersonal(chain);
  const read = useAccountRead(chain);
  const ready = personal && read === "ready";
  const list: Position[] = !ready ? [] : sub === "spot" ? spotPositions(chain) : farmPositions(chain);
  const hist = ready ? ACTIVITY[chain].filter((x) => x.area === AREA[sub]) : [];
  const pnl = list.reduce((t, p) => t + p.pnl, 0);
  const pnlKnown = !list.some((p) => p.pnlKnown === false);
  const to = sub === "farm" ? "/farm" : "/trade";

  return (
    <>
      <SumCard
        k={sub === "farm" ? "Earned" : "Open P&L"}
        v={ready && pnlKnown ? sUsd(pnl) : "—"}
        tone={pnlKnown ? sign(pnl) : undefined}
        range="30D"
        pairs={[{ label: sub === "farm" ? "Deposited" : "Size", value: ready ? usd(list.reduce((t, p) => t + p.size, 0)) : "—" }, { label: "Positions", value: ready ? String(list.length) : "—" }]}
        chart={<Chart pts={[]} color={sub === "farm" ? colors.positive : colors.link} label={`${AREA[sub]} P&L, last 30 days`} />}
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
                    <Text style={{ fontFamily: font.semibold, fontSize: 16, color: p.pnlKnown === false ? C.muted : sign(p.pnl) === "neg" ? C.neg : C.pos }}>{p.pnlKnown === false ? "—" : sUsd(p.pnl)}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: p.pnlKnown === false ? C.muted : sign(p.pnl) === "neg" ? C.neg : C.pos }}>{p.pnlKnown === false ? "—" : spct(p.pct)}</Text>
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

// When the open positions were first opened: for each one, the oldest "Open / increase" row since that market and side last
// closed (PERP_HIST is newest first). null when any position has no such row (its date is not known, so no "Since" chip).
function firstOpen(ps: PerpPos[]): string | null {
  let at = -1;
  for (const p of ps) {
    let i0 = -1;
    for (let i = 0; i < PERP_HIST.length; i++) {
      const h = PERP_HIST[i];
      if (h.k !== p.k || h.side !== p.side) continue;
      if (h.a === "Close / reduce" && i0 >= 0) break;
      if (h.a === "Open / increase") i0 = i;
    }
    if (i0 < 0) return null;
    at = Math.max(at, i0);
  }
  return at >= 0 ? PERP_HIST[at].t.split(",")[0] : null;
}

// Trader > Perps (design portfolio perpsBody): Unrealized P&L with Value, Size and Realized; Current | History; Close all; one card per
// position with Size, Entry / Mark, Collateral / Equity and Liq. price, close and share. Whole page empty: "No perps positions".
function PerpsBody() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"cur" | "hist">("cur");
  const personal = usePersonal(chain);
  const read = useAccountRead(chain);
  const ready = personal && read === "ready";
  const d = DATA[chain];
  const list = ready && chain === "solana" ? d.perps : [];
  const hist = ready ? ACTIVITY[chain].filter((x) => x.area === "Perps") : [];
  if (ready && !list.length && !hist.length) return <EmptyCard title="No perps positions" action="Open Perps" onAction={() => router.push("/trade/perp/SOL" as Href)} module="perps" />;

  const upnl = list.reduce((t, p) => t + perpPnl(p), 0);
  const value = d.phoenixIdle + list.reduce((t, p) => t + p.coll + perpPnl(p), 0);
  const size = list.reduce((t, p) => t + perpQty(p) * perpMark(p.k), 0);
  const realKnown = ready && !d.realizedUnknown;
  const since = ready ? firstOpen(list) : null;
  return (
    <>
      <SumCard
        k="Unrealized P&L"
        v={ready ? sUsd(upnl) : "—"}
        tone={ready ? sign(upnl) : undefined}
        range={since ? `Since ${since}` : undefined}
        pairs={[
          { label: "Value", value: ready ? usd(value) : "—" },
          { label: "Size", value: ready ? usd(size) : "—" },
          { label: "Realized", value: realKnown ? sUsd(d.realized) : "—", tone: realKnown ? sign(d.realized) : undefined },
        ]}
        chart={<Chart pts={[]} color={colors.link} label="Perps P&L" />}
      />
      <SubTabs items={[["cur", "Current", list.length], ["hist", "History", hist.length]]} value={tab} onChange={setTab} fam={families.portfolio} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>
          {tab === "hist" ? (
            <HistoryList rows={hist} module="trade" />
          ) : !list.length ? (
            <EmptyCard title="No open perps positions" action="Open Perps" onAction={() => router.push("/trade/perp/SOL" as Href)} module="perps" />
          ) : (
            <>
              <CloseAllBar chain={chain} n={list.length} />
              {list.map((p) => (
                <PerpCard key={p.id} p={p} />
              ))}
            </>
          )}
        </View>
      </Swap>
    </>
  );
}

// A Perps position (design pf-card): pair, side + leverage (on the shared Phoenix collateral), P&L and ROE; a 2 x 2 grid; close and share.
// The card opens the position page.
function PerpCard({ p }: { p: PerpPos }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const mark = perpMark(p.k), qty = perpQty(p), pnl = perpPnl(p), liq = liqFor(chain, p);
  const marked = Number.isFinite(mark) && mark > 0;
  const name = `${p.k}-PERP`, tone = sign(pnl) === "neg" ? colors.negative : colors.positive;
  // liqFor uses the margin account's own check (health 1.10) when it has one, else Phoenix's on the shared collateral
  const tip = liqPriceOf(chain, p.k, p.side) != null
    ? `If only ${p.k} moves, the price where the whole margin account reaches health factor 1.10.`
    : `Estimate: the ${p.k} price where this position's share of the shared Phoenix collateral, plus its P&L, falls to the 5% maintenance margin.`;
  return (
    <Pressable onPress={() => router.push(`/trade/position/${p.id}` as Href)} accessibilityRole="button" accessibilityLabel={`${name} ${p.side}, open the position`}>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TokenBadge sym={p.k} size={40} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>{name}</Text>
            <View style={{ flexDirection: "row" }}>
              <Tag label={`${p.side === "long" ? "Long" : "Short"} ${levTag(p.lev)}`} tone={p.side} />
            </View>
            {p.pool != null && <Text style={[styles.tip, { color: colors.muted, paddingBottom: 0 }]}>{`On ${nf(p.pool, 2)} USDC shared Phoenix collateral`}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: marked ? tone : colors.muted, fontVariant: ["tabular-nums"] }}>{marked ? sUsd(pnl) : "—"}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: marked ? tone : colors.muted, fontVariant: ["tabular-nums"] }}>{marked && p.coll > 0 ? spct((pnl / p.coll) * 100) : "—"}</Text>
          </View>
        </View>
        <Pairs
          n={2}
          items={[
            { label: "Size", value: marked ? usd(qty * mark) : "—", sub: tokFmt(qty, p.k) },
            { label: "Entry", value: p.entry > 0 ? priceFmt(p.entry) : "—", sub: `Mark ${marked ? priceFmt(mark) : "—"}` },
            { label: "Collateral", value: usd(p.coll), sub: `Equity ${marked ? usd(p.coll + pnl) : "—"}` },
            { label: "Liq. price", value: liq ? priceFmt(liq) : "None", sub: liq && marked ? `${spct((liq / mark - 1) * 100, 1)} away` : undefined, tip },
          ]}
        />
        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <IconAction icon="close" label={`Close ${name}`} tone="neg" onPress={() => closePosition(chain, p)} />
          <IconAction icon={shareIcon} label={`Share ${name}`} onPress={() => openShare({ kind: "perps", id: p.id })} />
        </View>
      </Card>
    </Pressable>
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
