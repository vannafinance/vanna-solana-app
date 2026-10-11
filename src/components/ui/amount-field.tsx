import type { ReactNode } from "react";
import { TextInput, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { amountFontSize } from "./amount-size";
import { AppText } from "./app-text";
import { QuickFillButton } from "./quick-fill-button";
import { Notice } from "./notice";

type QuickFill = { label: string; fraction: number };

type AmountFieldProps = {
  label: string;
  caption?: string;
  value: string;
  onChangeText: (value: string) => void;
  tokenSlot: ReactNode;
  quickFills?: readonly QuickFill[];
  onQuickFill?: (fraction: number) => void;
  error?: string;
  secondary?: string;
};

export function AmountField({ label, caption, value, onChangeText, tokenSlot, quickFills, onQuickFill, error, secondary }: AmountFieldProps) {
  const { colors, fontFamily, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="caption" color="textMuted">
          {label}
        </AppText>
        {caption ? (
          <AppText variant="caption" color="textMuted">
            {caption}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <TextInput
          scrollEnabled={false}
maxFontSizeMultiplier={1}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            padding: 0, includeFontPadding: false, textAlignVertical: "center",
            ...amountFontSize(value, 32),
            fontFamily: fontFamily.semibold,
            color: error ? colors.negative : colors.text,
          }}
        />
        {tokenSlot}
      </View>
      {secondary ? (
        <AppText variant="caption" color="textMuted">
          {secondary}
        </AppText>
      ) : null}
      {quickFills && onQuickFill ? (
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
          {quickFills.map((fill) => (
            <QuickFillButton key={fill.label} flex label={fill.label} onPress={() => onQuickFill(fill.fraction)} />
          ))}
        </View>
      ) : null}
      {error ? <Notice tone="error" message={error} /> : null}
    </View>
  );
}
