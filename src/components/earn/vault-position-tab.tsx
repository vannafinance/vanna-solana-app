import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatToken, formatUsd } from "@/format/format-amount";
import { formatEarnedAmount } from "@/format/format-earn";
import type { VaultDetail, VaultPosition } from "@/types/earn";

import { FactCard, FactRow } from "./fact-card";

type VaultPositionTabProps = {
  vault: VaultDetail;
  position: VaultPosition;
};

export function VaultPositionTab({ vault, position }: VaultPositionTabProps) {
  return (
    <View style={{ marginTop: 12 }}>
      <FactCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
          <TokenIcon symbol={vault.symbol} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>
              {formatUsd(position.valueUsd)}
            </AppText>
            <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
              {`${formatToken(position.shares, 2)} ${vault.shareSymbol} shares`}
            </AppText>
          </View>
        </View>
        <FactRow
          label="Interest earned"
          value={position.earned === null ? "—" : `+${formatEarnedAmount(position.earned, vault.symbol)}`}
          valueColor={position.earned === null ? "text" : "positive"}
          detail={position.earned === null ? "Needs the full supply history" : undefined}
        />
      </FactCard>
    </View>
  );
}
