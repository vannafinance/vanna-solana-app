import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Card, CardHead, EmptyCard, IconAction, Pairs, Row, shareIcon, SplitBar, Tag, text, TokenBadge } from "@/components/ui/kit";
import { levFmt, pct, sign, spct, sUsd, usd } from "@/format";
import { DATA } from "@/sample/data";
import { hasMargin, lendRows, openPositions, portfolioTotals } from "@/sample/model";
import { useChain } from "@/state/chain";
import { useAccountRead } from "@/chain/account-live";
import { usePersonal } from "@/state/personal";
import { useTheme } from "@/theme/use-theme";
import { TokenLogo } from "@/components/brand";
import { brand, font } from "@/theme/tokens";

import { usePfColors, type TraderSub } from "./shared";
import { openShare } from "@/screens/share/share";

// Compact Overview (portfolio.js overview, mode 'full'): Net earnings, Margin account, Lending, Positions.
export function Overview({ openLender, openTrader }: { openLender: () => void; openTrader: (sub?: TraderSub) => void }) {
  const { chain } = useChain();
  const ready = usePersonal(chain);
  const read = useAccountRead(chain);
  const T = portfolioTotals(chain);

  if (ready && read !== "ready") return <EmptyCard title="" />;
  if (!ready || (T.net < 0.005 && !DATA[chain].lend.length && !hasMargin(DATA[chain]))) {
    return <EmptyCard title="Nothing here yet" action="Browse pools" onAction={() => router.navigate("/lend")} />;
  }

  return (
    <View style={{ gap: 12 }}>
      <EarnCard />
      <MarginCard openTrader={openTrader} />
      <LendCard openLender={openLender} />
      <PositionsCard openTrader={openTrader} />
    </View>
  );
}

function EarnCard() {
  const { chain } = useChain();
  const T = portfolioTotals(chain);
  const C = usePfColors();
  const parts: [string, number, string, boolean][] = [["Lending", T.earnLend, C.l, T.earnLendKnown], ["Trading", T.earnTrade, C.m, T.earnTradeKnown]];
  const net = parts.reduce((t, p) => t + p[1], 0);
  // a part the chain's history cannot back shows "—", and so does the total
  const known = T.netEarnKnown;
  return (
    <Card>
      <Text style={[text.muted, { color: C.muted }]}>Net earnings</Text>
      <Text style={[text.big, { color: known && sign(net) === "neg" ? C.neg : known && sign(net) === "pos" ? C.pos : C.text }]}>{known ? sUsd(net) : "—"}</Text>
      <SplitBar parts={parts.map((p) => [p[3] ? p[1] : 0, p[2]])} />
      <Pairs items={parts.map(([label, v, dot, k]) => ({ label, value: k ? sUsd(v) : "—", dot, tone: k ? sign(v) : undefined }))} />
    </Card>
  );
}

function MarginCard({ openTrader }: { openTrader: (sub?: TraderSub) => void }) {
  const { chain } = useChain();
  const C = usePfColors();
  const d = DATA[chain];
  if (!hasMargin(d)) return <EmptyCard title="No margin account yet" action="Open Margin" onAction={() => router.navigate("/margin")} />;

  const T = portfolioTotals(chain);
  const a = T.a;
  const interest = d.margin.debt.some((x) => x.amt > 0) ? d.margin.interestPaid : 0;
  const used: [string, number, TraderSub | null, string][] = (
    [
      ["Spot", a.spotUsd, "spot", C.l],
      ["Perps", chain === "solana" ? a.perpEq : 0, "perps", C.m],
      ["Farm", a.farmUsd, "farm", brand.farm],
      ["Idle", a.availUsd, null, C.w],
    ] as [string, number, TraderSub | null, string][]
  ).filter((p) => p[1] > 0.005 || p[0] === "Spot");

  return (
    <Card>
      <CardHead
        title="Margin account"
        right={
          <View style={{ flexDirection: "row", gap: 4, marginRight: -10 }}>
            <IconAction icon={shareIcon} label="Share health factor" onPress={() => openShare({ kind: "health" })} />
            <IconAction icon="chevron_right" label="Open Margin" tone="plain" onPress={() => router.navigate("/margin")} />
          </View>
        }
      />
      <Pairs
        items={[
          { label: "Borrowed", value: usd(a.debtUsd) },
          { label: "Leverage", value: levFmt(a.lev) },
          { label: "Interest", value: T.interestKnown || !d.margin.debt.some((x) => x.amt > 0) ? usd(interest) : "—" },
        ]}
      />
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: C.text, marginTop: 4 }}>Used in</Text>
      <SplitBar parts={used.map((p) => [p[1], p[3]])} />
      <Pairs
        n={2}
        items={used.map(([label, v, sub, dot]) => ({
          label,
          value: usd(v),
          dot,
          chevron: sub ? "chevron_right" : undefined,
          onPress: sub ? () => openTrader(sub) : undefined,
        }))}
      />
    </Card>
  );
}

function LendCard({ openLender }: { openLender: () => void }) {
  const { chain } = useChain();
  const rows = lendRows(chain);
  if (!rows.length) return <EmptyCard title="Nothing lent yet" action="Browse pools" onAction={() => router.navigate("/lend")} />;

  return (
    <Card>
      <CardHead title="Lending" right={<SeeAll onPress={openLender} />} />
      {rows.map((r) => (
        <Row
          key={r.sym}
          lead={<TokenBadge sym={r.sym} />}
          title={r.sym}
          sub={`${pct(r.apy)} APY`}
          value={usd(r.value)}
          subValue={r.earnedKnown ? sUsd(r.earned) : "—"}
          subTone={r.earnedKnown ? sign(r.earned) : undefined}
          onPress={openLender}
        />
      ))}
    </Card>
  );
}

function PositionsCard({ openTrader }: { openTrader: (sub?: TraderSub) => void }) {
  const { chain } = useChain();
  const all = openPositions(chain).sort((x, y) => y.size - x.size);
  if (!all.length) return <EmptyCard title="No open positions" action="Open Margin" onAction={() => router.navigate("/margin")} />;

  return (
    <Card>
      <CardHead title="Positions" right={<SeeAll count={all.length > 3 ? all.length : undefined} onPress={() => openTrader()} />} />
      {all.slice(0, 3).map((p) => (
        <Row
          key={p.id}
          lead={<TokenBadge sym={p.sym} />}
          title={p.name}
          sub={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {p.tags.map((t) => (
                <Tag key={t.label} {...t} />
              ))}
              {p.venue ? <TokenLogo sym={p.venue} size={16} /> : null}
            </View>
          }
          value={p.pnlKnown === false ? "—" : sUsd(p.pnl)}
          valueTone={p.pnlKnown === false ? undefined : sign(p.pnl)}
          subValue={p.pnlKnown === false ? "—" : spct(p.pct)}
          subTone={p.pnlKnown === false ? undefined : sign(p.pnl)}
          onPress={() => openTrader(p.sub)}
        />
      ))}
    </Card>
  );
}

function SeeAll({ count, onPress }: { count?: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count ? `See all ${count}` : "See all"}
      style={{ flexDirection: "row", alignItems: "center", minHeight: 44, paddingHorizontal: 10, marginRight: -10 }}
    >
      {count != null && <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{count}</Text>}
      <Icon name="chevron_right" size={22} />
    </Pressable>
  );
}
