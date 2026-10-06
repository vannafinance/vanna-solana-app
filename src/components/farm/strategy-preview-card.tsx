import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent, formatSignedPercent, formatToken } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { PoolSymbol, StrategyPreview } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { DASH, healthDotColor, healthLabel, signedTone, yearlyText } from "./farm-format";

type StrategyPreviewCardProps = {
  // Null until there is a valid amount: every figure shows a dash, the rates stay.
  preview: StrategyPreview | null;
  pool: { symbol: PoolSymbol; decimals: number; supplyApyBps: number; borrowApyBps: number };
};

const leverageText = (value: number | null) => (value === null ? "None" : `${value.toFixed(2)}x`);
const healthFigure = (value: number | null) => (value === null || !Number.isFinite(value) ? "No debt" : value.toFixed(2));
const healthWord = (value: number | null) => (value === null || !Number.isFinite(value) ? undefined : healthLabel(value));

// What the deposit and leverage turn into, updated as they change: the projected return, the loan and the Kamino supply,
// then how the whole margin account moves. Rates move, so the return is an estimate at today's rates.
export function StrategyPreviewCard({ preview, pool }: StrategyPreviewCardProps) {
  const { spacing } = useTheme();
  const digits = pool.decimals <= 6 ? 2 : 3;
  const tokens = (raw: bigint) => `${formatToken({ raw, decimals: pool.decimals }, digits)} ${pool.symbol}`;

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <CapsLabel>STRATEGY PREVIEW</CapsLabel>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            At current rates
          </AppText>
        </View>

        <View
          accessible
          accessibilityLabel={preview ? `Projected net return ${yearlyText(preview.yearlyNetUsd)}, net APY ${formatSignedPercent(preview.netApyBps)}` : "Projected net return, enter an amount"}
          style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}
        >
          <View style={{ flexShrink: 1, gap: 2 }}>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              Projected net return
            </AppText>
            <AppText variant="heading" strong numberOfLines={1} color={preview ? signedTone(preview.yearlyNetUsd) : "textMuted"}>
              {preview ? yearlyText(preview.yearlyNetUsd) : DASH}
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 2 }}>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              Net APY
            </AppText>
            <AppText variant="title" strong numberOfLines={1} color={preview ? signedTone(preview.netApyBps) : "textMuted"}>
              {preview ? formatSignedPercent(preview.netApyBps) : DASH}
            </AppText>
          </View>
        </View>

        <StatStrip
          stats={[
            { label: "You borrow", value: preview ? tokens(preview.borrow.raw) : DASH, sub: `${formatPercent(pool.borrowApyBps)} APY` },
            { label: "Supplied to Kamino", value: preview ? tokens(preview.supplied.raw) : DASH, sub: `${formatPercent(pool.supplyApyBps)} APY` },
          ]}
        />

        <View style={{ gap: spacing.sm }}>
          <CapsLabel>MARGIN ACCOUNT</CapsLabel>
          <StatStrip
            stats={[
              { label: "Leverage now", value: preview ? leverageText(preview.leverage.now) : DASH },
              { label: "Leverage after", value: preview ? leverageText(preview.leverage.after) : DASH },
              {
                label: "Health now",
                value: preview ? healthFigure(preview.health.now) : DASH,
                sub: preview ? healthWord(preview.health.now) : undefined,
                valueColor: preview && preview.health.now !== null ? healthDotColor(preview.health.now) : "text",
              },
              {
                label: "Health after",
                value: preview ? healthFigure(preview.health.after) : DASH,
                sub: preview ? healthWord(preview.health.after) : undefined,
                valueColor: preview ? healthDotColor(preview.health.after) : "text",
              },
            ]}
          />
        </View>
      </View>
    </Card>
  );
}
