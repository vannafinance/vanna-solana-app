import { Check } from "phosphor-react-native";
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { BottomSheet } from "./bottom-sheet";

export type Option<T extends string> = {
  value: T;
  label: string;
  detail?: string;
  leading?: ReactNode;
};

type OptionSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onDismiss: () => void;
};

export function OptionSheet<T extends string>({ visible, title, options, selected, onSelect, onDismiss }: OptionSheetProps<T>) {
  const { colors, spacing } = useTheme();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <AppText variant="title" style={{ marginBottom: spacing.sm }}>
        {title}
      </AppText>
      <ScrollView style={{ maxHeight: 420 }}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              onPress={() => {
                onSelect(option.value);
                onDismiss();
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64 }}
            >
              {option.leading}
              <View style={{ flex: 1 }}>
                <AppText variant="bodyLg" strong>
                  {option.label}
                </AppText>
                {option.detail ? (
                  <AppText variant="label" color="textMuted">
                    {option.detail}
                  </AppText>
                ) : null}
              </View>
              {active ? <Check size={20} color={colors.primary} weight="bold" /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}
