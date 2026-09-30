import { ArrowUpRight } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { useTheme } from "@/theme/use-theme";
import type { FarmHistoryEntry, FarmHistoryKind } from "@/types/farm";

import { withSymbol } from "./farm-format";

type FarmHistoryCardProps = {
  entry: FarmHistoryEntry;
  onOpenTransaction: () => void;
};

const TONES = { deposit: "teal", withdraw: "teal", borrow: "pink", redeem: "purple", repay: "purple" } as const satisfies Record<
  FarmHistoryKind,
  "teal" | "pink" | "purple"
>;

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

function shortSignature(signature: string) {
  return `${signature.slice(0, 4)}…${signature.slice(-4)}`;
}

export function FarmHistoryCard({ entry, onOpenTransaction }: FarmHistoryCardProps) {
  const { colors, spacing } = useTheme();
  const signature = shortSignature(entry.signature);

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyLg" strong>{`${entry.collateralSymbol}-${entry.poolSymbol} Farm`}</AppText>
            <AppText variant="body" color="textMuted">
              {formatTimestamp(entry.occurredAt)}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open transaction ${signature} in explorer`}
            onPress={onOpenTransaction}
            hitSlop={12}
            style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <AppText variant="body" strong color="link">
              {signature}
            </AppText>
            <ArrowUpRight size={14} color={colors.link} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {entry.actions.map((action) => (
            <Pill
              key={`${action.kind}-${action.symbol}`}
              tone={TONES[action.kind]}
              label={`${action.kind.toUpperCase()} ${withSymbol(action.amount, action.symbol)}`}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}
