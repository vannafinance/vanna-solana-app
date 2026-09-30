import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { Pill } from "@/components/ui/pill";
import { formatUsd } from "@/format/format-amount";
import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";

type AccountCardProps = {
  walletBalance: bigint;
  marginBalance: bigint;
  marginAddress: string | null;
};

export function AccountCard({ walletBalance, marginBalance, marginAddress }: AccountCardProps) {
  const { spacing } = useTheme();

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
      <View style={{ minHeight: 48, justifyContent: "center" }}>
        <AppText variant="body" strong color="textMuted">
          Account
        </AppText>
      </View>
      <DetailRow label="Wallet balance" value={formatUsd(walletBalance)} />
      <DetailRow label="Margin account balance" value={formatUsd(marginBalance)} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56 }}>
        <AppText variant="bodyLg" color="textMuted">
          Margin account
        </AppText>
        {marginAddress === null ? (
          <Pill label="Not created" tone="pink" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Pill label="Active" tone="teal" />
            <AppText variant="bodyLg" strong style={{ fontFamily: "monospace" }}>
              {shortAddress(marginAddress)}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}
