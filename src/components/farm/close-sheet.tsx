import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatUsd } from "@/format/format-amount";
import { brandGradient, horizontalGradient } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { EXIT_FRACTIONS_BPS, type CloseView, type ExitFractionBps } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatHealth, pairLabel, withSymbol } from "./farm-format";

type CloseSheetProps = {
  visible: boolean;
  view: CloseView;
  onSelectFraction: (fraction: ExitFractionBps) => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

const SHEET_HEIGHT_SHARE = 0.86;

type QuoteRowProps = { label: string; value: string; sub?: string; height?: number };

function QuoteRow({ label, value, sub, height = 52 }: QuoteRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        minHeight: height,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
      }}
    >
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="body" strong>
          {value}
        </AppText>
        {sub ? (
          <AppText variant="caption" color="textMuted">
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function CloseSheet({ visible, view, onSelectFraction, onConfirm, onDismiss }: CloseSheetProps) {
  const { colors, radius } = useTheme();
  const { height } = useWindowDimensions();
  const { pool, stock, leverage, quote } = view;
  const all = quote.fractionBps === 10000;
  const returnsStock = all && stock !== null;
  const receive = stock === null ? withSymbol(quote.leftover, pool) : `${withSymbol(quote.collateralReturned, stock)} + ${withSymbol(quote.leftover, pool)}`;
  const subtitle = stock === null ? `Kamino ${pool} position · stock not shown` : `${pairLabel(stock, pool)} · ${(leverage ?? 1).toFixed(2)}x`;

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <ScrollView style={{ maxHeight: height * SHEET_HEIGHT_SHARE }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TokenIcon symbol={stock ?? pool} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading" style={{ lineHeight: 28 }}>
              Close position
            </AppText>
            <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
              {subtitle}
            </AppText>
          </View>
          <IconButton icon="close" label="Close" tone="tonal" size={44} onPress={onDismiss} />
        </View>
        <CapsLabel style={{ marginTop: 18 }}>EXIT AMOUNT</CapsLabel>
        <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
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
        <View style={{ marginTop: 12 }}>
          <QuoteRow label="Redeem from Kamino" value={withSymbol(quote.redeem, pool)} sub={formatUsd(quote.redeemValueUsd)} />
          <QuoteRow label="Repay debt + interest" value={withSymbol(quote.repay, pool)} sub={formatUsd(quote.repayValueUsd)} />
          {stock === null ? null : (
            <QuoteRow label="Return collateral" value={withSymbol(quote.collateralReturned, stock)} sub={formatUsd(quote.collateralReturnedValueUsd)} />
          )}
          <QuoteRow label={`Remaining ${pool} debt`} value={formatUsd(quote.remainingDebtValueUsd)} height={48} />
          {stock === null ? null : (
            <QuoteRow
              label="Position health"
              value={quote.healthAfter === null ? "Position closed" : `${formatHealth(quote.healthAfter)} after closing`}
              height={48}
            />
          )}
        </View>
        <View style={{ marginTop: 8, padding: 14, borderRadius: radius.md, backgroundColor: colors.purpleTint }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="arrow_downward" size={14} color="onPurpleTint" />
            <CapsLabel color="onPurpleTint">YOU RECEIVE</CapsLabel>
          </View>
          <View style={{ marginTop: 6, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <AppText variant="bodyLg" strong style={{ flex: 1 }}>
              {receive}
            </AppText>
            <AppText variant="bodyLg" color="textMuted">
              {formatUsd(quote.receiveValueUsd)}
            </AppText>
          </View>
          <AppText variant="caption" color="textMuted">
            {returnsStock ? "Back to your wallet · 2 approvals" : "Back to your wallet · 1 approval"}
          </AppText>
        </View>
        <View style={{ marginTop: 16 }}>
          <Button brand label={`${all ? "Close all" : `Close ${quote.fractionBps / 100}%`} · approve in wallet`} onPress={onConfirm} />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
