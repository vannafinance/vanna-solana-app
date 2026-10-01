import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { DetailRow } from "@/components/ui/detail-row";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatLiquidationPrice, formatTokenSize, sideLabel } from "@/format/format-perps";
import { useTheme } from "@/theme/use-theme";
import type { CloseQuote, PositionSummary } from "@/types/perps";

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
  const { colors } = useTheme();
  const closingAll = quote.fractionBps === 10_000;

  return (
    <View>
      <SheetHeader
        symbol={position.symbol}
        title="Close position"
        subtitle={`${position.pair} · ${sideLabel(position.side)} ${position.leverage}x`}
        onClose={onDismiss}
      />
      <SheetSectionLabel label="Close amount" />
      <SheetChoiceRow
        selectedTone="tint"
        choices={fractionsBps.map((bps) => ({ label: `${bps / 100}%`, selected: bps === quote.fractionBps, onPress: () => onSelectFraction(bps) }))}
      />
      <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.divider }}>
        <DetailRow label="Closing" value={`${formatTokenSize(quote.tokens, position.symbol)} · ${formatUsd(quote.size)}`} />
        <DetailRow label="Realized PnL" value={formatSignedUsd(quote.pnl)} valueColor={quote.pnl >= 0n ? "positive" : "negative"} />
        <DetailRow label="Trading fee" value={`-${formatUsd(quote.fee)}`} />
        <DetailRow label="Back to margin account" value={formatUsd(quote.toMargin)} last={closingAll} />
        {closingAll ? null : <DetailRow label="Liquidation price" value={`Unchanged · ${formatLiquidationPrice(quote.liquidationPrice)}`} last />}
      </View>
      <View style={{ marginTop: 16 }}>
        <Button label={`Close ${closingAll ? "all" : `${quote.fractionBps / 100}%`} · approve in wallet`} onPress={onSubmit} />
      </View>
    </View>
  );
}
