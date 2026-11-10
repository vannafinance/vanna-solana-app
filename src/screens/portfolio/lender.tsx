import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Chart, curve } from "@/components/chart";
import { HistoryList } from "@/components/history";
import { PillTabs, SubTabs, Swap } from "@/components/motion";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, supplyMark, text, TokenBadge, withdrawMark } from "@/components/ui/kit";
import { nf, pct, sign, sUsd, tokFmt, usd } from "@/format";
import { ACTIVITY } from "@/sample/data";
import { lendRows, lendTotals, predictPositions, predictSummary } from "@/sample/model";
import { useChain } from "@/state/chain";
import { usePersonal } from "@/state/personal";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { toast } from "@/ui/overlay";

import { usePfColors } from "./shared";
import { openShare } from "@/screens/share/share";

type Sub = "pools" | "predict";

// Lender (portfolio.js lender): Pools | Predict (Solana only); a summary card with its chart; Current | History.
export function Lender() {
  const { chain } = useChain();
  const [sub, setSub] = useState<Sub>("pools");
  const current: Sub = chain === "solana" ? sub : "pools";

  return (
    <View style={{ gap: 12 }}>
      {chain === "solana" && <PillTabs items={[["pools", "Pools"], ["predict", "Predict"]]} value={current} onChange={setSub} color={families.portfolio.tab} />}
      <Swap k={current}>
        <View style={{ gap: 12 }}>{current === "pools" ? <Pools /> : <Predict />}</View>
      </Swap>
    </View>
  );
}

// Summary card: headline + range chip, pairs, chart.
export function SumCard({ k, v, tone, range, pairs, chart }: { k: string; v: string; tone?: string; range?: string; pairs: Parameters<typeof Pairs>[0]["items"]; chart: React.ReactNode }) {
  const { colors } = useTheme();
  const C = usePfColors();
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={[text.muted, { color: C.muted, flex: 1 }]}>{k}</Text>
        {range && (
          <View style={[styles.range, { backgroundColor: colors.segment }]}>
            <Text style={[styles.rangeText, { color: colors.text }]}>{range}</Text>
          </View>
        )}
      </View>
      <Text style={[text.big, { color: tone === "pos" ? C.pos : tone === "neg" ? C.neg : C.text }]}>{v}</Text>
      {pairs.length > 0 && <Pairs items={pairs} />}
      {chart}
    </Card>
  );
}

function Pools() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const C = usePfColors();
  const [tab, setTab] = useState<"cur" | "hist">("cur");
  const ready = usePersonal(chain);
  const l = lendTotals(chain);
  const rows = ready ? lendRows(chain) : [];
  const hist = ready ? ACTIVITY[chain].filter((a) => a.area === "Earn") : [];

  return (
    <>
      <SumCard
        k="Interest earned"
        v={ready ? sUsd(l.earned) : "—"}
        tone={ready ? sign(l.earned) : undefined}
        range="30D"
        pairs={ready ? [{ label: "Holdings", value: usd(l.sup + l.earned) }, { label: "Avg APY", value: pct(l.apy) }] : []}
        chart={ready ? <Chart pts={curve(l.earned, 2)} color={colors.positive} label="Interest earned, last 30 days" /> : null}
      />
      <SubTabs items={[["cur", "Current", rows.length], ["hist", "History", hist.length]]} value={tab} onChange={setTab} fam={families.portfolio} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>
          {tab === "hist" ? (
            <HistoryList rows={hist} module="earn" />
          ) : !rows.length ? (
            <EmptyCard title="Nothing supplied yet" action="Browse pools" onAction={() => router.navigate("/lend")} module="earn" />
          ) : (
            rows.map((r) => (
              <Card key={r.sym}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <TokenBadge sym={r.sym} size={40} />
                  <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 18, color: colors.text }}>{r.sym}</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>{usd(r.value)}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: sign(r.earned) === "pos" ? C.pos : C.muted }}>{sUsd(r.earned)}</Text>
                  </View>
                </View>
                <Pairs items={[{ label: "Supplied", value: tokFmt(r.amt, r.sym) }, { label: "APY", value: pct(r.apy) }]} />
                <View style={styles.acts}>
                  <IconAction icon={supplyMark} label={`Supply more ${r.sym}`} onPress={() => router.navigate("/lend")} />
                  <IconAction icon={withdrawMark} label={`Withdraw ${r.sym}`} onPress={() => router.navigate("/lend")} />
                  <IconAction icon={shareIcon} label={`Share ${r.sym} lending`} onPress={() => openShare({ kind: "earn", id: r.sym })} />
                </View>
              </Card>
            ))
          )}
        </View>
      </Swap>
    </>
  );
}

function Predict() {
  const { chain } = useChain();
  const { colors } = useTheme();
  const C = usePfColors();
  const s = predictSummary(chain);
  const ps = predictPositions(chain);

  return (
    <>
      <SumCard
        k="Open value"
        v={usd(s.value)}
        pairs={[
          { label: "P&L", value: sUsd(s.pnl), tone: sign(s.pnl) },
          { label: "Earned", value: sUsd(s.earned), tone: sign(s.earned) },
          { label: "Positions", value: String(s.count) },
        ]}
        chart={<Chart pts={curve(s.pnl, 3)} color={colors.link} label="Prediction P&L, last 30 days" />}
      />
      {ps.map((p) => (
        <Card key={p.eventId}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>{p.event}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted }}>Yes · {p.market}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>{usd(p.value)}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: sign(p.pnl) === "neg" ? C.neg : C.pos }}>{sUsd(p.pnl)}</Text>
            </View>
          </View>
          <Pairs
            items={[
              { label: "Shares", value: nf(p.shares, 2) },
              { label: "Avg", value: `${nf(p.avg * 100, 0)}¢` },
              { label: "Now", value: `${nf(p.mark * 100, 0)}¢` },
            ]}
          />
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  acts: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  range: { height: 24, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  rangeText: { fontFamily: font.semibold, fontSize: 12 },
});
