import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatToken, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { TokenBalance } from "@/types/portfolio";

type SpotListProps = {
  walletBalance: bigint;
  balances: readonly TokenBalance[];
};

export function SpotList({ walletBalance, balances }: SpotListProps) {
  const { colors, spacing } = useTheme();

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}>
      <View style={{ height: 56, justifyContent: "center" }}>
        <AppText variant="caption" color="textMuted">
          Wallet balance
        </AppText>
        <AppText variant="bodyLg" strong style={{ lineHeight: 24 }}>
          {formatUsd(walletBalance)}
        </AppText>
      </View>
      {balances.map((balance) => (
        <View
          key={balance.symbol}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, height: 64, borderTopWidth: 1, borderTopColor: colors.divider }}
        >
          <TokenIcon symbol={balance.symbol} size={36} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="body" strong>
              {balance.symbol}
            </AppText>
            <AppText variant="caption" color="textMuted">
              Wallet
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
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
