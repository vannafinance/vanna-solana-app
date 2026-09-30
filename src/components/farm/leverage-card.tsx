import { CaretDown, CaretUp } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { formatPercent, formatToken, formatUsd } from "@/format/format-amount";
import { health } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { DeployForm } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatHealth, formatYearlyProfit, withSymbol } from "./farm-format";
import { HealthGauge } from "./health-gauge";
import { LeverageSlider } from "./leverage-slider";
import { StepHeader } from "./step-header";

type LeverageCardProps = {
  form: DeployForm;
  minLeverage: number;
  maxLeverage: number;
  onChangeLeverage: (value: number) => void;
};

export function LeverageCard({ form, minLeverage, maxLeverage, onChangeLeverage }: LeverageCardProps) {
  const { colors, radius, spacing } = useTheme();
  const [showSteps, setShowSteps] = useState(false);
  const { pool, collateral, quote, leverage } = form;
  const hf = quote.healthFactor ?? Number.POSITIVE_INFINITY;
  const borrowText = withSymbol(quote.borrow, pool.symbol);
  const leverageText = `${leverage.toFixed(1)}x`;
  const Caret = showSteps ? CaretUp : CaretDown;

  return (
    <Card>
      <View style={{ gap: spacing.lg }}>
        <StepHeader step={2} title="Set leverage" subtitle={`Borrow ${pool.symbol} from Vanna, backed by your ${collateral.symbol}`} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="bodyLg" color="textMuted">
            Leverage
          </AppText>
          <AppText variant="bodyLg" strong color="link">
            {leverageText}
          </AppText>
        </View>
        <LeverageSlider value={leverage} min={minLeverage} max={maxLeverage} onChange={onChangeLeverage} />
        <View>
          <DetailRow label="Deposit" value={withSymbol(form.amount, collateral.symbol)} />
          <DetailRow
            label="Borrow"
            value={pool.symbol === "USDC" ? `${borrowText} (≈${formatUsd(quote.debtUsd)})` : borrowText}
          />
          <DetailRow label={`${pool.symbol} borrow APY (Vanna)`} value={formatPercent(pool.borrowApyBps)} valueColor="negative" />
          <DetailRow label="Supplied to Kamino" value={formatUsd(quote.debtUsd)} valueColor="positive" />
          <DetailRow label="Kamino supply APY" value={formatPercent(pool.supplyApyBps)} valueColor="positive" />
          <DetailRow
            label={`${pool.symbol} pool total supplied`}
            value={`${formatToken({ raw: pool.totalSupplied, decimals: pool.decimals }, 0)} ${pool.symbol}`}
          />
          <DetailRow label={`${pool.symbol} pool utilization`} value={formatPercent(pool.utilizationBps)} last />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.md,
            backgroundColor: colors.tealTint,
          }}
        >
          <View style={{ flex: 1 }}>
            <CapsLabel color="onTealTint">{`Projected net profit at ${leverage}X`}</CapsLabel>
            <AppText variant="caption" style={{ color: colors.onTealTint }}>
              {`${formatUsd(quote.projectedMonthlyUsd)}/mo · Kamino yield minus Vanna borrow cost`}
            </AppText>
          </View>
          <AppText variant="title" strong style={{ color: colors.onTealTint }}>
            {formatYearlyProfit(quote.projectedYearlyUsd)}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, gap: 4, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}>
            <CapsLabel>Health factor</CapsLabel>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <HealthGauge health={hf} />
              <AppText variant="heading">{formatHealth(hf)}</AppText>
            </View>
          </View>
          <View style={{ flex: 1, gap: 4, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}>
            <CapsLabel>Effective leverage</CapsLabel>
            <AppText variant="heading">{leverageText}</AppText>
          </View>
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="How this works"
            accessibilityState={{ expanded: showSteps }}
            onPress={() => setShowSteps(!showSteps)}
            style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <AppText variant="body" strong>
              How this works
            </AppText>
            <Caret size={16} color={colors.textMuted} />
          </Pressable>
          {showSteps ? (
            <View style={{ gap: 4 }}>
              <AppText variant="caption" color="textMuted">
                {`1. Deposit ${withSymbol(form.amount, collateral.symbol)} as collateral and borrow ${borrowText} at ${leverageText}.`}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {`2. Supply it into Kamino's main market. Your ${collateral.symbol} stays as collateral and the debt is backed by the Kamino receipt. Liquidation happens at health ${health.liquidation.toFixed(2)}.`}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
