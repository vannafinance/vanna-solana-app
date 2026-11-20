import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Chart } from "@/components/chart";
import { HistoryList } from "@/components/history";
import { SubTabs, Swap } from "@/components/motion";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, supplyMark, text, TokenBadge, withdrawMark } from "@/components/ui/kit";
import { pct, sign, sUsd, tokFmt, usd } from "@/format";
import { ACTIVITY } from "@/sample/data";
import { lendRows, lendTotals } from "@/sample/model";
import { useChain } from "@/state/chain";
import { useAccountRead } from "@/chain/account-live";
import { usePersonal } from "@/state/personal";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { toast } from "@/ui/overlay";

import { usePfColors } from "./shared";
import { openAmount } from "@/screens/earn/amount";
import { openShare } from "@/screens/share/share";

// Lender (portfolio.js lender): a summary card with its chart; Current | History.
export function Lender() {
  return (
    <View style={{ gap: 12 }}>
      <Pools />
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
  const personal = usePersonal(chain);
  const read = useAccountRead(chain);
  const ready = personal && read === "ready";
  const l = lendTotals(chain);
  const rows = ready ? lendRows(chain) : [];
  const hist = ready ? ACTIVITY[chain].filter((a) => a.area === "Earn") : [];

  return (
    <>
      <SumCard
        k="Interest earned"
        v={ready && l.earnedKnown ? sUsd(l.earned) : "—"}
        tone={ready && l.earnedKnown ? sign(l.earned) : undefined}
        range="30D"
        pairs={ready ? [{ label: "Holdings", value: usd(l.sup + l.earned) }, { label: "Avg APY", value: pct(l.apy) }] : []}
        chart={ready ? <Chart pts={[]} color={colors.positive} label="Interest earned, last 30 days" /> : null}
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
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: r.earnedKnown && sign(r.earned) === "pos" ? C.pos : C.muted }}>{r.earnedKnown ? sUsd(r.earned) : "—"}</Text>
                  </View>
                </View>
                <Pairs items={[{ label: "Supplied", value: tokFmt(r.held, r.sym) }, { label: "APY", value: pct(r.apy) }]} />
                <View style={styles.acts}>
                  <IconAction icon={supplyMark} label={`Supply more ${r.sym}`} onPress={() => openAmount(chain, r.sym, "supply")} />
                  <IconAction icon={withdrawMark} label={`Withdraw ${r.sym}`} onPress={() => openAmount(chain, r.sym, "withdraw")} />
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

const styles = StyleSheet.create({
  acts: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  range: { height: 24, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  rangeText: { fontFamily: font.semibold, fontSize: 12 },
});
