import { ArrowsDownUp } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatToken, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { TokenBalance } from "@/types/portfolio";

type SpotListProps = {
  walletBalance: bigint;
  balances: readonly TokenBalance[];
  onSwap: () => void;
};

export function SpotList({ walletBalance, balances, onSwap }: SpotListProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 64 }}>
        <View>
          <AppText variant="caption" color="textMuted">
            Wallet balance
          </AppText>
          <AppText variant="bodyLg" strong>
            {formatUsd(walletBalance)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap"
          onPress={onSwap}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.background }}
        >
          <ArrowsDownUp size={16} color={colors.text} />
          <AppText variant="body" strong>
            Swap
          </AppText>
        </Pressable>
      </View>
      {balances.map((balance) => (
        <View
          key={balance.symbol}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, borderTopWidth: 1, borderTopColor: colors.divider }}
        >
          <TokenIcon symbol={balance.symbol} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="body" strong>
              {balance.symbol}
            </AppText>
            <AppText variant="caption" color="textMuted">
              Wallet
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="body" strong>
              {formatUsd(balance.value)}
            </AppText>
            <AppText variant="caption" color="textMuted">{`${formatToken(balance.tokens, 2)} ${balance.symbol}`}</AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}
