import { ScrollView, useWindowDimensions, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { ClaimStatus, FaucetMessage, FaucetRow } from "@/types/faucet";

type FaucetSheetProps = {
  visible: boolean;
  rows: readonly FaucetRow[];
  message: FaucetMessage | null;
  connected: boolean;
  busy: boolean;
  onClaim: (symbol: FaucetRow["symbol"]) => void;
  onClaimAll: () => void;
  onDismiss: () => void;
};

const LIST_SHARE_OF_SCREEN = 0.42;

const BUTTON: Record<ClaimStatus, { label: string; variant: "tonal" | "outline"; icon?: "check" }> = {
  idle: { label: "Mint", variant: "tonal" },
  pending: { label: "Minting", variant: "tonal" },
  done: { label: "Minted", variant: "tonal", icon: "check" },
  error: { label: "Retry", variant: "outline" },
};

function Row({ row, disabled, onClaim }: { row: FaucetRow; disabled: boolean; onClaim: () => void }) {
  const { colors, spacing } = useTheme();
  const button = BUTTON[row.status];

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <TokenIcon symbol={row.symbol} size={36} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" strong>
          {row.symbol}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {row.detail}
        </AppText>
      </View>
      <Button size="sm" variant={button.variant} label={button.label} icon={button.icon} loading={row.status === "pending"} disabled={disabled && row.status !== "pending"} onPress={onClaim} />
    </View>
  );
}

// Test tokens for the Vanna fork, as in the web app's faucet: SOL for fees first, then the tokens to trade with.
export function FaucetSheet({ visible, rows, message, connected, busy, onClaim, onClaimAll, onDismiss }: FaucetSheetProps) {
  const { spacing } = useTheme();
  const { height } = useWindowDimensions();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title="Test faucet">
      <AppText variant="caption" color="textMuted">
        Free test tokens on the Vanna fork. No real funds. Claim as often as you like.
      </AppText>
      <ScrollView style={{ maxHeight: height * LIST_SHARE_OF_SCREEN, marginTop: spacing.md }} showsVerticalScrollIndicator={false}>
        {rows.map((row) => (
          <Row key={row.symbol} row={row} disabled={busy || !connected} onClaim={() => onClaim(row.symbol)} />
        ))}
      </ScrollView>
      <View accessibilityLiveRegion="polite" style={{ minHeight: 40, justifyContent: "center" }}>
        <AppText variant="caption" color={connected ? (message?.tone === "negative" ? "negative" : message?.tone === "positive" ? "positive" : "textMuted") : "negative"}>
          {connected ? (message?.text ?? "SOL pays for network fees, so claim it first.") : "Connect a wallet to use the faucet."}
        </AppText>
      </View>
      <Button label="Mint all" disabled={!connected || busy} onPress={onClaimAll} />
    </BottomSheet>
  );
}
