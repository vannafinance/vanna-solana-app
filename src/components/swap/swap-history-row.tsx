import { ArrowRight } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatSwapAmount } from "@/format/format-swap-amount";
import { useTheme } from "@/theme/use-theme";
import type { SwapHistoryGroup } from "@/types/swap";

type SwapHistoryRowProps = {
  group: SwapHistoryGroup;
};

const ICON_SIZE = 32;

export function SwapHistoryRow({ group }: SwapHistoryRowProps) {
  const { colors, spacing } = useTheme();
  const date = new Date(group.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <Card>
      <AppText variant="bodyLg" color="textMuted" style={{ paddingBottom: spacing.md }}>
        {date}
      </AppText>
      {group.entries.map((entry, index) => {
        const received = `${formatSwapAmount(entry.amountOut.raw, entry.amountOut.decimals, entry.to)} ${entry.to}`;
        const paid = `${formatSwapAmount(entry.amountIn.raw, entry.amountIn.decimals, entry.from)} ${entry.from}`;
        return (
          <View
            key={entry.id}
            accessible
            accessibilityLabel={`${entry.from} to ${entry.to}, received ${received}, paid ${paid}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              minHeight: 72,
              borderTopWidth: 1,
              borderTopColor: colors.divider,
              paddingTop: index === 0 ? spacing.md : 0,
            }}
          >
            <View style={{ width: ICON_SIZE * 1.6, height: ICON_SIZE }}>
              <View style={{ position: "absolute", left: 0 }}>
                <TokenIcon symbol={entry.from} size={ICON_SIZE} />
              </View>
              <View style={{ position: "absolute", right: 0 }}>
                <TokenIcon symbol={entry.to} size={ICON_SIZE} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <AppText variant="bodyLg" strong>
                  {entry.from}
                </AppText>
                <ArrowRight size={14} color={colors.text} weight="bold" />
                <AppText variant="bodyLg" strong numberOfLines={1} style={{ flexShrink: 1 }}>
                  {entry.to}
                </AppText>
              </View>
              <AppText variant="body" color="textMuted">
                From wallet
              </AppText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <AppText variant="bodyLg" strong>
                {`+${received}`}
              </AppText>
              <AppText variant="body" color="textMuted">
                {paid}
              </AppText>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
