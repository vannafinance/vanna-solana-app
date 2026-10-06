import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { StatStrip } from "@/components/ui/stat-strip";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatUsd } from "@/format/format-amount";
import { brandGradient, horizontalGradient } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { EXIT_FRACTIONS_BPS, type CloseView, type ExitFractionBps } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatHealth, healthDotColor, pairLabel, withSymbol } from "./farm-format";

type CloseSheetProps = {
  visible: boolean;
  view: CloseView;
  onSelectFraction: (fraction: ExitFractionBps) => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

const SHEET_HEIGHT_SHARE = 0.86;

// Closing part or all of a position: pick how much, see what is redeemed, repaid and returned, and what lands in the wallet.
// A position whose stock the history does not show closes only its Kamino part, so it has no stock to return.
export function CloseSheet({ visible, view, onSelectFraction, onConfirm, onDismiss }: CloseSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const { height } = useWindowDimensions();
  const { pool, stock, leverage, quote } = view;
  const all = quote.fractionBps === 10000;
  const returnsStock = all && stock !== null;
  const receive = stock === null ? withSymbol(quote.leftover, pool) : `${withSymbol(quote.collateralReturned, stock)} + ${withSymbol(quote.leftover, pool)}`;
  const healthAfter = quote.healthAfter === null ? "Closed" : formatHealth(quote.healthAfter);

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <ScrollView style={{ maxHeight: height * SHEET_HEIGHT_SHARE }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <TokenIcon symbol={stock ?? pool} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="title" numberOfLines={1}>
              Close position
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {stock === null ? `Kamino ${pool}` : pairLabel(stock, pool)}
              </AppText>
              {leverage === null ? null : <Pill label={`${leverage.toFixed(2)}x`} tone="purple" />}
            </View>
          </View>
          <IconButton icon="close" label="Close" tone="tonal" size={44} onPress={onDismiss} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <CapsLabel>EXIT AMOUNT</CapsLabel>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {EXIT_FRACTIONS_BPS.map((fraction) => {
              const selected = fraction === quote.fractionBps;
              const label = `${fraction / 100}%`;
              return (
                <Pressable
                  key={fraction}
                  accessibilityRole="button"
                  accessibilityLabel={`Exit ${label}`}
                  accessibilityState={{ selected }}
                  onPress={() => onSelectFraction(fraction)}
                  style={{ flex: 1, height: 48, borderRadius: radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}
                >
                  {selected ? <LinearGradient colors={brandGradient} {...horizontalGradient} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} /> : null}
                  <AppText variant="bodyLg" strong style={{ color: selected ? colors.onPrimary : colors.text }}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <StatStrip
          stats={[
            { label: "Redeem", value: formatUsd(quote.redeemValueUsd), sub: withSymbol(quote.redeem, pool) },
            { label: "Repay", value: formatUsd(quote.repayValueUsd), sub: withSymbol(quote.repay, pool) },
            ...(stock === null ? [] : [{ label: "Return", value: formatUsd(quote.collateralReturnedValueUsd), sub: withSymbol(quote.collateralReturned, stock) }]),
          ]}
        />
        <StatStrip
          stats={[
            { label: `${pool} debt left`, value: formatUsd(quote.remainingDebtValueUsd) },
            ...(stock === null ? [] : [{ label: "Health after", value: healthAfter, valueColor: quote.healthAfter === null ? ("text" as const) : healthDotColor(quote.healthAfter) }]),
          ]}
        />

        <View style={{ padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.purpleTint, gap: spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
            <CapsLabel color="onPurpleTint">YOU RECEIVE</CapsLabel>
            <AppText variant="caption" color="onPurpleTint">
              {returnsStock ? "2 wallet approvals" : "1 wallet approval"}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
            <AppText variant="bodyLg" strong style={{ flex: 1 }}>
              {receive}
            </AppText>
            <AppText variant="bodyLg" strong>
              {formatUsd(quote.receiveValueUsd)}
            </AppText>
          </View>
        </View>

        <Button brand label={all ? "Close all" : `Close ${quote.fractionBps / 100}%`} onPress={onConfirm} />
      </ScrollView>
    </BottomSheet>
  );
}
