import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ExplorerLink } from "@/components/ui/explorer-link";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { useTheme } from "@/theme/use-theme";

export type ActivityRowProps = {
  icon: IconName;
  tone: "teal" | "purple";
  // What happened ("Supplied") over where or when ("USDC vault", "Oct 1").
  title: string;
  detail: string;
  // The amount, right-aligned, with its dollar value under it when known.
  value: string;
  valueSub?: string;
  positive?: boolean;
  signature?: string;
  onOpenTransaction: (signature: string) => void;
  first?: boolean;
};

const LINK_SIZE = 44;

// One transaction in an Earn list: icon, what and where on the left, the amount on the right, then the explorer link.
// Rows without a transaction keep the link's space, so every amount lines up on the same right edge.
export function ActivityRow({ icon, tone, title, detail, value, valueSub, positive = false, signature, onOpenTransaction, first = false }: ActivityRowProps) {
  const { colors, radius, spacing } = useTheme();
  const teal = tone === "teal";

  return (
    <View
      style={{
        minHeight: 64,
        paddingVertical: spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: teal ? colors.tealTint : colors.purpleTint }}>
        <Icon name={icon} size={18} color={teal ? "onTealTint" : "onPurpleTint"} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" strong numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      <View style={{ flexShrink: 1, alignItems: "flex-end", gap: 2 }}>
        <AppText variant="body" strong numberOfLines={1} color={positive ? "positive" : "text"} style={{ textAlign: "right" }}>
          {value}
        </AppText>
        {valueSub ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ textAlign: "right" }}>
            {valueSub}
          </AppText>
        ) : null}
      </View>
      {signature !== undefined ? <ExplorerLink signature={signature} onOpen={onOpenTransaction} /> : <View style={{ width: LINK_SIZE }} />}
    </View>
  );
}
