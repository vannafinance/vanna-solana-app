import { TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TokenPill } from "@/components/ui/token-pill";
import type { TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

type QuickFill = { label: string; fraction: number };

type CollateralCardProps = {
  // The asset that is actually deposited: USDC for a long, the stock itself for a short.
  symbol: TokenSymbol;
  // Says what the typed number is, so a USD amount is not read as a token count.
  note?: string | null;
  caption: string;
  value: string;
  onChangeText: (value: string) => void;
  exceeds: boolean;
  quickFills: readonly QuickFill[];
  onQuickFill: (fraction: number) => void;
};

export function CollateralCard({ symbol, note, caption, value, onChangeText, exceeds, quickFills, onQuickFill }: CollateralCardProps) {
  const { colors, fontFamily } = useTheme();

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="caption" color="textMuted">
          Collateral
        </AppText>
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
      </View>
      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TextInput
          accessibilityLabel="Collateral amount"
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, padding: 0, fontSize: 32, lineHeight: 40, fontFamily: fontFamily.semibold, color: exceeds ? colors.negative : colors.text }}
        />
        <TokenPill symbol={symbol} />
      </View>
      {note ? (
        <AppText variant="caption" color="textMuted" style={{ marginTop: 4 }}>
          {note}
        </AppText>
      ) : null}
      <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
        {quickFills.map((fill) => (
          <Chip key={fill.label} flex size="sm" label={fill.label} onPress={() => onQuickFill(fill.fraction)} />
        ))}
      </View>
    </Card>
  );
}
