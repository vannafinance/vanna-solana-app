import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { formatUsd } from "@/format/format-amount";
import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";

type AccountCardProps = {
  walletBalance: bigint;
  marginAddress: string | null;
};

export function AccountCard({ walletBalance, marginAddress }: AccountCardProps) {
  const { colors, spacing } = useTheme();
  const row = { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.divider } as const;

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
      <View style={{ height: 44, justifyContent: "center" }}>
        <AppText variant="caption" strong color="textMuted">
          Account
        </AppText>
      </View>
      <View style={row}>
        <AppText variant="body" color="textMuted">
          Wallet balance
        </AppText>
        <AppText variant="body" strong>
          {formatUsd(walletBalance)}
        </AppText>
      </View>
      <View style={row}>
        <AppText variant="body" color="textMuted">
          Margin account
        </AppText>
        {marginAddress === null ? (
          <Pill label="Not created" tone="pink" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pill label="Active" tone="teal" />
            <AppText variant="body" style={{ fontFamily: "monospace" }}>
              {shortAddress(marginAddress)}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}
