import { View } from "react-native";

import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";
import type { ReviewData, ReviewTone } from "@/types/review";

import { AppText } from "./app-text";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { DetailRow } from "./detail-row";
import { Icon } from "./icon";

type ReviewSheetProps = {
  data: ReviewData | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const TONE_COLOR = { default: "text", positive: "positive", negative: "negative" } as const satisfies Record<ReviewTone, string>;

// The step before the wallet opens: what leaves, what arrives, the fees, which wallet and network, then one clear choice.
// Nothing is signed or sent until the user confirms here and then approves in their wallet.
export function ReviewSheet({ data, onConfirm, onCancel }: ReviewSheetProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <BottomSheet visible={data !== null} onDismiss={onCancel} title={data?.title}>
      {data === null ? null : (
        <View>
          <View style={{ gap: spacing.xs, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.background }}>
            {data.legs.map((leg, index) => (
              <View key={leg.label}>
                {index > 0 ? (
                  <View style={{ alignItems: "center", marginVertical: spacing.sm }}>
                    <Icon name="arrow_downward" size={18} color="textMuted" />
                  </View>
                ) : null}
                <AppText variant="caption" color="textMuted">
                  {leg.label}
                </AppText>
                <AppText strong accessibilityLabel={`${leg.label}, ${leg.value}`} style={{ fontSize: 26, lineHeight: 34, letterSpacing: -0.26 }}>
                  {leg.value}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {leg.caption}
                </AppText>
              </View>
            ))}
          </View>

          <View style={{ marginTop: spacing.sm }}>
            {data.rows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} valueColor={TONE_COLOR[row.tone ?? "default"]} />
            ))}
            <DetailRow label="Wallet" value={`${data.wallet.name} · ${shortAddress(data.wallet.address)}`} />
            <DetailRow label="Network" value={data.network} last />
          </View>

          <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.md, textAlign: "center" }}>
            Nothing moves until you approve in your wallet.
          </AppText>
          <View style={{ marginTop: spacing.lg, gap: 2 }}>
            <Button label={data.confirmLabel} icon="account_balance_wallet" onPress={onConfirm} />
            <Button size="md" variant="text" label="Cancel" onPress={onCancel} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
