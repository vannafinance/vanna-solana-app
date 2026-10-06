import type { ReactNode } from "react";
import { TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { QuickFillButton } from "@/components/ui/quick-fill-button";
import { useTheme } from "@/theme/use-theme";

type QuickFill = { label: string; fraction: number };

type SwapTokenCardProps = {
  label: string;
  balance: string;
  tokenMenu: ReactNode;
  usdValue: string;
  value: string;
  onChangeText?: (value: string) => void;
  exceeds?: boolean;
  quickFills?: readonly QuickFill[];
  onQuickFill?: (fraction: number) => void;
};

const AMOUNT = { fontSize: 32, lineHeight: 40 } as const;

export function SwapTokenCard({ label, balance, tokenMenu, usdValue, value, onChangeText, exceeds = false, quickFills, onQuickFill }: SwapTokenCardProps) {
  const { colors, fontFamily } = useTheme();

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="caption" color="textMuted">
          {label}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {balance}
        </AppText>
      </View>
      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        {onChangeText ? (
          <TextInput
            scrollEnabled={false}
            accessibilityLabel={label}
            value={value}
            onChangeText={onChangeText}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, minWidth: 0, padding: 0, includeFontPadding: false, textAlignVertical: "center", ...AMOUNT, fontFamily: fontFamily.semibold, color: exceeds ? colors.negative : colors.text }}
          />
        ) : (
          <AppText strong numberOfLines={1} style={{ flex: 1, minWidth: 0, ...AMOUNT }}>
            {value}
          </AppText>
        )}
        {tokenMenu}
      </View>
      <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="caption" color="textMuted">
          {usdValue}
        </AppText>
        {quickFills && onQuickFill ? (
          <View style={{ flexDirection: "row", gap: 6 }}>
            {quickFills.map((fill) => (
              <QuickFillButton key={fill.label} label={fill.label} onPress={() => onQuickFill(fill.fraction)} />
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}
