import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { formatLiquidationPrice, formatTokenSize } from "@/format/format-perps";
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
  const closingAll = quote.fractionBps === 10_000;

  return (
    <View>
      <SheetHeader symbol={position.symbol} title="Close position" pair={position.pair} side={position.side} leverage={position.leverage} onClose={onDismiss} />
      <SheetSectionLabel label="Close amount" />
      <SheetChoiceRow
        selectedTone="tint"
        choices={fractionsBps.map((bps) => ({ label: `${bps / 100}%`, selected: bps === quote.fractionBps, onPress: () => onSelectFraction(bps) }))}
      />
      <View style={{ marginTop: 16, gap: 12 }}>
        <StatStrip
          stats={[
            { label: "Closing", value: formatUsd(quote.size), sub: formatTokenSize(quote.tokens, position.symbol) },
            { label: "Realized PnL", value: formatSignedUsd(quote.pnl), valueColor: quote.pnl >= 0n ? "positive" : "negative" },
            { label: "Trading fee", value: quote.fee > 0n ? `-${formatUsd(quote.fee)}` : formatUsd(0n) },
            { label: quote.returnsTo === "wallet" ? "Back to your wallet" : "Stays in margin account", value: formatUsd(quote.toWallet) },
          ]}
        />
        {closingAll ? null : (
          <AppText variant="caption" color="textMuted">
            {`The rest stays open. Its liquidation price stays at ${formatLiquidationPrice(quote.liquidationPrice)}.`}
          </AppText>
        )}
      </View>
      <View style={{ marginTop: 16 }}>
        <Button brand label={`Close ${closingAll ? "all" : `${quote.fractionBps / 100}%`} · approve in wallet`} onPress={onSubmit} />
      </View>
    </View>
  );
}
