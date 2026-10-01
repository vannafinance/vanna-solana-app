import type { ReactNode } from "react";
import { TextInput, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Chip } from "./chip";
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
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            padding: 0,
            fontSize: 32,
            lineHeight: 40,
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
            <Chip key={fill.label} flex size="sm" label={fill.label} onPress={() => onQuickFill(fill.fraction)} />
          ))}
        </View>
      ) : null}
      {error ? <Notice tone="error" message={error} /> : null}
    </View>
  );
}
