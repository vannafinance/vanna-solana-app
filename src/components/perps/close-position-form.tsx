import { View } from "react-native";

import { DetailRow } from "@/components/ui/detail-row";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import type { CloseQuote, PositionSummary } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

import { formatLiquidationPrice, formatTokenSize, sideLabel } from "@/format/format-perps";
import { GradientButton } from "./gradient-button";
import { SheetChoiceRow } from "./sheet-choice-row";
import { SheetHeader } from "./sheet-header";
import { SheetSectionLabel } from "./sheet-section-label";

type ClosePositionFormProps = {
  position: PositionSummary;
  quote: CloseQuote;
  fractionsBps: readonly number[];
  onSelectFraction: (bps: number) => void;
  onSubmit: () => void;
  onDismiss: () => void;
};

export function ClosePositionForm({ position, quote, fractionsBps, onSelectFraction, onSubmit, onDismiss }: ClosePositionFormProps) {
  const { spacing } = useTheme();
  const closingAll = quote.fractionBps === 10_000;
  const percent = `${quote.fractionBps / 100}%`;

  return (
    <View style={{ gap: spacing.md }}>
      <SheetHeader
        symbol={position.symbol}
        title="Close position"
        subtitle={`${position.pair} · ${sideLabel(position.side)} ${position.leverage}x`}
        onClose={onDismiss}
      />
      <SheetSectionLabel label="Close amount" />
      <SheetChoiceRow
        selectedTone="dark"
        choices={fractionsBps.map((bps) => ({ label: `${bps / 100}%`, selected: bps === quote.fractionBps, onPress: () => onSelectFraction(bps) }))}
      />
      <View>
        <DetailRow label="Closing" value={`${formatTokenSize(quote.tokens, position.symbol)} · ${formatUsd(quote.size)}`} />
        <DetailRow label="Realized PnL" value={formatSignedUsd(quote.pnl)} valueColor={quote.pnl >= 0n ? "positive" : "negative"} />
        <DetailRow label="Trading fee" value={`-${formatUsd(quote.fee)}`} />
        <DetailRow
          label="Back to margin account"
          value={formatUsd(quote.toMargin)}
          last={closingAll}
        />
        {closingAll ? null : (
          <DetailRow label="Liquidation price" value={`Unchanged · ${formatLiquidationPrice(quote.liquidationPrice)}`} last />
        )}
      </View>
      <GradientButton label={`Close ${closingAll ? "all" : percent} · approve in wallet`} onPress={onSubmit} />
    </View>
  );
}
