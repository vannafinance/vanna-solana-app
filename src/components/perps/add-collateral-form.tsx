import { Wallet } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { formatUnits, formatUsd } from "@/format/format-amount";
import type { AddCollateralQuote, PerpsAccount, PositionSummary } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

import { formatLiquidationPrice, sideLabel } from "./format-perps";
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

function whole(amount: bigint) {
  return formatUnits(amount, 6, 0);
}

export function AddCollateralForm({ position, account, quote, presets, insufficient, onSelectAmount, onSubmit, onDismiss }: AddCollateralFormProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <SheetHeader
        symbol={position.symbol}
        title="Add collateral"
        subtitle={`${position.pair} · ${sideLabel(position.side)} ${position.leverage}x`}
        onClose={onDismiss}
      />
      <SheetSectionLabel label="Amount" />
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
          <AppText variant="display" style={{ color: insufficient ? colors.negative : colors.text }}>
            {whole(quote.amount)}
          </AppText>
          <AppText variant="bodyLg" strong color="textMuted">
            USDC
          </AppText>
        </View>
        <AppText variant="caption" color={insufficient ? "negative" : "textMuted"}>
          {`From your margin account · ${formatUsd(account.available)} available`}
        </AppText>
      </View>
      <SheetChoiceRow
        selectedTone="primary"
        choices={presets.map((preset) => ({
          label: `$${formatUnits(preset, 6, 0)}`,
          selected: preset === quote.amount,
          onPress: () => onSelectAmount(preset),
        }))}
      />
      <View>
        <DetailRow label="Position collateral" value={`${formatUsd(position.collateral)} → ${formatUsd(quote.collateralAfter)}`} />
        <DetailRow
          label="Liquidation price"
          value={`${formatLiquidationPrice(position.liquidationPrice)} → ${formatLiquidationPrice(quote.liquidationAfter)}`}
          valueColor="positive"
        />
        <DetailRow label="Margin available" value={`${formatUsd(account.available)} → ${formatUsd(quote.availableAfter)}`} valueColor={insufficient ? "negative" : "text"} last />
      </View>
      <Button
        icon={Wallet}
        disabled={insufficient}
        label={insufficient ? "Not enough margin available" : `Add ${formatUsd(quote.amount)} · approve in wallet`}
        onPress={onSubmit}
      />
    </View>
  );
}
