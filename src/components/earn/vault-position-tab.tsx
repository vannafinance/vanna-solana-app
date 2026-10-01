import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatToken, formatUsd } from "@/format/format-amount";
import { formatEarnedAmount, formatFullAmount } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail, VaultPosition } from "@/types/earn";

import { FactCard, FactRow } from "./fact-card";

const VIEWS = [
  { value: "current", label: "Current" },
  { value: "history", label: "History" },
] as const;

type VaultPositionTabProps = {
  vault: VaultDetail;
  position: VaultPosition;
};

export function VaultPositionTab({ vault, position }: VaultPositionTabProps) {
  const [view, setView] = useState<(typeof VIEWS)[number]["value"]>("current");

  return (
    <View style={{ marginTop: 8 }}>
      <SegmentedControl segments={VIEWS} value={view} onChange={setView} dense />
      <View style={{ marginTop: 12 }}>
        {view === "current" ? <CurrentPosition vault={vault} position={position} /> : <PositionHistory vault={vault} position={position} />}
      </View>
    </View>
  );
}

function CurrentPosition({ vault, position }: VaultPositionTabProps) {
  return (
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
      <FactRow label="Interest earned" value={`+${formatEarnedAmount(position.earned, vault.symbol)}`} valueColor="positive" />
    </FactCard>
  );
}

function PositionHistory({ vault, position }: VaultPositionTabProps) {
  const { colors } = useTheme();

  if (position.events.length === 0) {
    return (
      <AppText variant="body" color="textMuted">
        No transactions yet
      </AppText>
    );
  }

  return (
    <FactCard>
      {position.events.map((event, index) => (
        <View
          key={event.signature}
          style={{ minHeight: 64, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.divider }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.purpleTint }}>
            <Icon name={event.kind === "supply" ? "arrow_upward" : "arrow_downward"} size={18} color="onPurpleTint" bold />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body" strong style={{ lineHeight: 20 }}>
              {`${event.kind === "supply" ? "Supply" : "Withdraw"} ${formatFullAmount(event.amount, vault.symbol)}`}
            </AppText>
            <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
              {`${event.date} · `}
              <AppText variant="caption" color="link">
                {event.signature}
              </AppText>
            </AppText>
          </View>
        </View>
      ))}
    </FactCard>
  );
}
