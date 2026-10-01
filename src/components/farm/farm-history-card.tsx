import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/use-theme";
import type { FarmHistoryAction, FarmHistoryEntry, FarmHistoryKind } from "@/types/farm";

import { formatTimestamp, shortSignature, withSymbol } from "./farm-format";

type FarmHistoryCardProps = {
  entry: FarmHistoryEntry;
  onOpenTransaction: () => void;
};

const TONES = { deposit: "teal", withdraw: "teal", borrow: "pink", redeem: "purple", repay: "purple" } as const satisfies Record<
  FarmHistoryKind,
  "teal" | "pink" | "purple"
>;

function ActionChip({ action }: { action: FarmHistoryAction }) {
  const { colors } = useTheme();
  const tone = {
    teal: { bg: colors.tealTint, fg: colors.onTealTint },
    pink: { bg: colors.pinkTint, fg: colors.onPinkTint },
    purple: { bg: colors.purpleTint, fg: colors.onPurpleTint },
  }[TONES[action.kind]];

  return (
    <View style={{ height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: tone.bg, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <AppText variant="caption" strong style={{ color: tone.fg, letterSpacing: 0.48 }}>
        {action.kind.toUpperCase()}
      </AppText>
      <AppText variant="caption" strong>
        {withSymbol(action.amount, action.symbol)}
      </AppText>
    </View>
  );
}

export function FarmHistoryCard({ entry, onOpenTransaction }: FarmHistoryCardProps) {
  const { colors, radius, shadow } = useTheme();
  const signature = shortSignature(entry.signature);

  return (
    <View style={[{ borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 14 }, shadow.card]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <AppText strong style={{ fontSize: 15, lineHeight: 20 }}>
            {`${entry.collateralSymbol}-${entry.poolSymbol} Farm`}
          </AppText>
          <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
            {formatTimestamp(entry.occurredAt)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open transaction ${signature} in explorer`}
          onPress={onOpenTransaction}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <AppText variant="caption" strong color="link">
            {signature}
          </AppText>
          <Icon name="arrow_outward" size={12} color="link" />
        </Pressable>
      </View>
      <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {entry.actions.map((action) => (
          <ActionChip key={`${action.kind}-${action.symbol}`} action={action} />
        ))}
      </View>
    </View>
  );
}
