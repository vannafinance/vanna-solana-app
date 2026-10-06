import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { formatUnits, formatUsd } from "@/format/format-amount";
import { formatLiquidationPrice } from "@/format/format-perps";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { AddCollateralQuote, PerpsAccount, PositionSummary } from "@/types/perps";

import { SheetChoiceRow } from "./sheet-choice-row";
import { SheetHeader } from "./sheet-header";
import { SheetSectionLabel } from "./sheet-section-label";

type AddCollateralFormProps = {
  position: PositionSummary;
  account: PerpsAccount;
  quote: AddCollateralQuote;
  presets: readonly bigint[];
  insufficient: boolean;
  onSelectAmount: (amount: bigint) => void;
  onSubmit: () => void;
  onDismiss: () => void;
};

type Change = { label: string; now: string; after: string; afterColor?: ThemeColor };

const COLUMN_WIDTH = 92;

function whole(amount: bigint) {
  return formatUnits(amount, 6, 0);
}

// What the deposit changes, as a small table: one row per figure, its value now and after, in aligned columns.
function ChangeTable({ rows }: { rows: readonly Change[] }) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ borderRadius: radius.sm, backgroundColor: colors.background, paddingHorizontal: spacing.md }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 36, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ flex: 1 }} />
        <AppText variant="caption" color="textMuted" style={{ width: COLUMN_WIDTH, textAlign: "right" }}>
          Now
        </AppText>
        <AppText variant="caption" color="textMuted" style={{ width: COLUMN_WIDTH, textAlign: "right" }}>
          After
        </AppText>
      </View>
      {rows.map((row) => (
        <View
          key={row.label}
          accessible
          accessibilityLabel={`${row.label}, now ${row.now}, after ${row.after}`}
          style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider }}
        >
          <AppText variant="body" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
            {row.label}
          </AppText>
          <AppText variant="body" color="textMuted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ width: COLUMN_WIDTH, textAlign: "right" }}>
            {row.now}
          </AppText>
          <AppText variant="body" strong color={row.afterColor ?? "text"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ width: COLUMN_WIDTH, textAlign: "right" }}>
            {row.after}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function AddCollateralForm({ position, account, quote, presets, insufficient, onSelectAmount, onSubmit, onDismiss }: AddCollateralFormProps) {
  const { colors } = useTheme();

  return (
    <View>
      <SheetHeader symbol={position.symbol} title="Add collateral" pair={position.pair} side={position.side} leverage={position.leverage} onClose={onDismiss} />
      <SheetSectionLabel label="Amount" />
      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <AppText strong style={{ fontSize: 36, lineHeight: 44, color: insufficient ? colors.negative : colors.text }}>
          {whole(quote.amount)}
        </AppText>
        <AppText variant="bodyLg" strong color="textMuted">
          USDC
        </AppText>
      </View>
      <AppText variant="caption" color={insufficient ? "negative" : "textMuted"}>
        {`${formatUsd(account.available)} available in your wallet`}
      </AppText>
      <SheetChoiceRow
        selectedTone="primary"
        choices={presets.map((preset) => ({
          label: `$${whole(preset)}`,
          selected: preset === quote.amount,
          onPress: () => onSelectAmount(preset),
        }))}
      />
      <View style={{ marginTop: 16 }}>
        <ChangeTable
          rows={[
            { label: "Collateral", now: formatUsd(position.collateral), after: formatUsd(quote.collateralAfter) },
            { label: "Liq. price", now: formatLiquidationPrice(position.liquidationPrice), after: formatLiquidationPrice(quote.liquidationAfter), afterColor: "positive" },
            { label: "Wallet USDC", now: formatUsd(account.available), after: formatUsd(quote.availableAfter), afterColor: insufficient ? "negative" : "text" },
          ]}
        />
      </View>
      <View style={{ marginTop: 16 }}>
        <Button
          disabled={insufficient}
          label={insufficient ? "Not enough USDC in your wallet" : `Add ${formatUsd(quote.amount)} · approve in wallet`}
          onPress={onSubmit}
        />
      </View>
    </View>
  );
}
