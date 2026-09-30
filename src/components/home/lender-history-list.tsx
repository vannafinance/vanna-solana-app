import { ArrowDown, ArrowUp, Coins, type Icon } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { LenderActivity, LenderActivityGroup } from "@/types/portfolio";

type LenderHistoryListProps = {
  groups: readonly LenderActivityGroup[];
};

const glyphs: Record<LenderActivity["kind"], { icon: Icon; tone: "teal" | "purple" }> = {
  interest: { icon: Coins, tone: "teal" },
  shares: { icon: Coins, tone: "teal" },
  supply: { icon: ArrowUp, tone: "purple" },
  withdraw: { icon: ArrowDown, tone: "purple" },
};

function ActivityRow({ activity }: { activity: LenderActivity }) {
  const { colors, radius, spacing } = useTheme();
  const { icon: Glyph, tone } = glyphs[activity.kind];
  const background = tone === "teal" ? colors.tealTint : colors.purpleTint;
  const foreground = tone === "teal" ? colors.onTealTint : colors.onPurpleTint;
  const value = activity.valueLabel ?? (activity.valueUsd === undefined ? "" : activity.gain ? formatSignedUsd(activity.valueUsd) : formatUsd(activity.valueUsd));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 64,
        borderTopWidth: 1,
        borderTopColor: colors.divider,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: background, alignItems: "center", justifyContent: "center" }}>
        <Glyph size={18} color={foreground} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body" strong>
          {activity.title}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {activity.detail}
        </AppText>
      </View>
      <AppText variant="body" strong color={activity.gain ? "positive" : "text"}>
        {value}
      </AppText>
    </View>
  );
}

export function LenderHistoryList({ groups }: LenderHistoryListProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      {groups.map((group) => (
        <Card key={group.label} padded={false} style={{ paddingHorizontal: spacing.lg }}>
          <View style={{ minHeight: 40, justifyContent: "center" }}>
            <AppText variant="caption" strong color="textMuted">
              {group.label}
            </AppText>
          </View>
          {group.items.map((item) => (
            <ActivityRow key={item.id} activity={item} />
          ))}
        </Card>
      ))}
    </View>
  );
}
