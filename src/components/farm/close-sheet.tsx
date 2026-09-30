import { ArrowDown, X } from "phosphor-react-native";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import { EXIT_FRACTIONS_BPS, type CloseView, type ExitFractionBps } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatHealth, pairLabel, withSymbol } from "./farm-format";
import { GradientButton } from "./gradient-button";

type CloseSheetProps = {
  visible: boolean;
  view: CloseView;
  onSelectFraction: (fraction: ExitFractionBps) => void;
  onConfirm: () => void;
  onDismiss: () => void;
};

const SHEET_HEIGHT_SHARE = 0.72;

type QuoteRowProps = { label: string; value: string; sub?: string };

function QuoteRow({ label, value, sub }: QuoteRowProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.lg,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
      }}
    >
      <AppText variant="bodyLg" style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="bodyLg" strong>
          {value}
        </AppText>
        {sub ? (
          <AppText variant="label" color="textMuted">
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function CloseSheet({ visible, view, onSelectFraction, onConfirm, onDismiss }: CloseSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const { height } = useWindowDimensions();
  const { position, quote } = view;
  const pool = position.poolSymbol;
  const all = quote.fractionBps === 10000;
  const receive = `${withSymbol(quote.collateralReturned, position.collateralSymbol)} + ${withSymbol(quote.leftover, pool)}`;

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <ScrollView style={{ maxHeight: height * SHEET_HEIGHT_SHARE }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <TokenIcon symbol={position.collateralSymbol} size={36} />
            <View style={{ flex: 1 }}>
              <AppText variant="heading">Close position</AppText>
              <AppText variant="body" color="textMuted">
                {`${pairLabel(position.collateralSymbol, pool)} · ${position.leverage.toFixed(2)}x`}
              </AppText>
            </View>
            <IconButton icon={X} label="Dismiss close position" tone="outline" onPress={onDismiss} />
          </View>
          <View style={{ gap: spacing.sm }}>
            <CapsLabel>Exit amount</CapsLabel>
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
                    style={{ flex: 1, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.segment }}
                  >
                    <LinearGradient
                      colors={selected ? [colors.short, colors.primary] : [colors.segment, colors.segment]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}
                    >
                      <AppText variant="bodyLg" strong style={{ color: selected ? colors.onPrimary : colors.text }}>
                        {label}
                      </AppText>
                    </LinearGradient>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View>
            <QuoteRow label="Redeem from Kamino" value={withSymbol(quote.redeem, pool)} sub={formatUsd(quote.redeemValueUsd)} />
            <QuoteRow label="Repay debt + interest" value={withSymbol(quote.repay, pool)} sub={formatUsd(quote.repayValueUsd)} />
            <QuoteRow
              label="Return collateral"
              value={withSymbol(quote.collateralReturned, position.collateralSymbol)}
              sub={formatUsd(quote.collateralReturnedValueUsd)}
            />
            <QuoteRow label={`Remaining ${pool} debt`} value={formatUsd(quote.remainingDebtValueUsd)} />
            <QuoteRow
              label="Position health"
              value={quote.healthAfter === null ? "Position closed" : `${formatHealth(quote.healthAfter)} (unchanged)`}
            />
          </View>
          <View style={{ padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.purpleTint, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ArrowDown size={16} color={colors.onPurpleTint} weight="bold" />
              <CapsLabel color="onPurpleTint">You receive</CapsLabel>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
              <AppText variant="title" strong style={{ flex: 1 }}>
                {receive}
              </AppText>
              <AppText variant="title" color="textMuted">
                {formatUsd(quote.receiveValueUsd)}
              </AppText>
            </View>
            <AppText variant="body" color="textMuted">
              Back to your wallet · 2 approvals
            </AppText>
          </View>
        </View>
      </ScrollView>
      <View style={{ marginTop: spacing.lg }}>
        <GradientButton label={`${all ? "Close all" : `Close ${quote.fractionBps / 100}%`} · approve in wallet`} onPress={onConfirm} />
      </View>
    </BottomSheet>
  );
}
