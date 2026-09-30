import { ArrowLeft } from "phosphor-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatCompactUsd, formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

type VaultDetailHeaderProps = {
  vault: VaultDetail;
  onBack: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyLg" strong>
        {value}
      </AppText>
    </View>
  );
}

export function VaultDetailHeader({ vault, onBack }: VaultDetailHeaderProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg }}>
      <View style={{ marginLeft: -spacing.sm, minHeight: 52, justifyContent: "center" }}>
        <IconButton icon={ArrowLeft} label="Back" onPress={onBack} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <TokenIcon symbol={vault.symbol} size={36} />
        <View>
          <AppText variant="bodyLg" strong>{`${vault.symbol} vault`}</AppText>
          <AppText variant="caption" color="textMuted">{`${vault.name} · Vanna lending pool`}</AppText>
        </View>
      </View>
      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.lg }}>
        Supply APY
      </AppText>
      <AppText variant="display" color="positive">
        {formatPercent(vault.supplyApyBps)}
      </AppText>
      <View
        style={{
          flexDirection: "row",
          gap: spacing.md,
          marginTop: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
        }}
      >
        <Stat label="Total supply" value={formatCompactUsd(vault.suppliedUsd)} />
        <Stat label="Available" value={formatCompactUsd(vault.suppliedUsd - vault.borrowedUsd)} />
        <Stat label="Utilization" value={formatPercent(vault.utilizationBps, 1)} />
      </View>
    </View>
  );
}
