import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useTheme } from "@/theme/use-theme";
import type { MarginAccountView } from "@/types/margin-account";

import { MarginEnvelope } from "./margin-envelope";

const unlocks: readonly { icon: IconName; text: string }[] = [
  { icon: "candlestick_chart", text: "Go long or short on stocks, up to 5x" },
  { icon: "layers", text: "Borrow against SOL, stablecoins and stocks" },
  { icon: "psychiatry", text: "Farm leveraged yield on Kamino" },
];

type MarginAccountSheetProps = {
  view: MarginAccountView;
};

// The margin account's first screen and its approval. The envelope stays on screen through both, so the wallet prompt is
// the envelope being sealed rather than a separate form.
export function MarginAccountSheet({ view }: MarginAccountSheetProps) {
  const { colors, spacing } = useTheme();

  return (
    <>
      <BottomSheet visible={view.intro && view.state === null} onDismiss={view.dismiss}>
        <View style={{ alignItems: "center", marginTop: spacing.sm }}>
          <MarginEnvelope address={view.address} stage="sealed" />
        </View>
        <AppText variant="heading" style={{ marginTop: spacing.lg, textAlign: "center" }}>
          Open your margin account
        </AppText>
        <AppText variant="body" color="textMuted" style={{ marginTop: spacing.xs, textAlign: "center" }}>
          One approval in your wallet. It holds your collateral for Perps and Farm.
        </AppText>
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          {unlocks.map(({ icon, text }) => (
            <View key={text} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
                <Icon name={icon} size={18} color="onPurpleTint" />
              </View>
              <AppText variant="body" style={{ flex: 1 }}>
                {text}
              </AppText>
            </View>
          ))}
        </View>
        <View style={{ marginTop: spacing.xl }}>
          <Button label="Open margin account" onPress={view.open} />
        </View>
      </BottomSheet>
      <TransactionSheet
        state={view.state}
        hero={<MarginEnvelope address={view.address} stage={view.stage} />}
        onPrimary={view.onPrimary}
        onClose={view.closeFlow}
        onExplorer={view.openExplorer}
        primaryLabel={view.state?.phase === "success" ? "Start trading" : undefined}
      />
    </>
  );
}
