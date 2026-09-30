import { ArrowDown, ArrowUp, Coins } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

export type EarnEventKind = "supply" | "withdraw" | "interest" | "shares";

type EarnEventRowProps = {
  kind: EarnEventKind;
  title: string;
  subtitle: string;
  trailing?: string;
  positive?: boolean;
  first?: boolean;
};

export function EarnEventRow({ kind, title, subtitle, trailing, positive = false, first = false }: EarnEventRowProps) {
  const { colors, spacing } = useTheme();
  const teal = kind === "interest" || kind === "shares";
  const Glyph = kind === "supply" ? ArrowUp : kind === "withdraw" ? ArrowDown : Coins;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        minHeight: 64,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: teal ? colors.tealTint : colors.purpleTint,
        }}
      >
        <Glyph size={20} color={teal ? colors.onTealTint : colors.onPurpleTint} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText strong>{title}</AppText>
        <AppText variant="caption" color="textMuted">
          {subtitle}
        </AppText>
      </View>
      {trailing ? (
        <AppText strong color={positive ? "positive" : "text"}>
          {trailing}
        </AppText>
      ) : null}
    </View>
  );
}
