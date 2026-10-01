import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { BottomSheet } from "./bottom-sheet";
import { Icon } from "./icon";
import { ripple } from "./ripple";

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
  const { colors, radius, spacing } = useTheme();

  return (
    <BottomSheet visible={visible} title={title} onDismiss={onDismiss}>
      <ScrollView style={{ maxHeight: 420 }}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              android_ripple={ripple(colors.text)}
              onPress={() => {
                onSelect(option.value);
                onDismiss();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                minHeight: 56,
                paddingHorizontal: 10,
                borderRadius: radius.sm,
                overflow: "hidden",
                backgroundColor: active ? colors.purpleTint : "transparent",
              }}
            >
              {option.leading}
              <View style={{ flex: 1 }}>
                <AppText variant="body" strong>
                  {option.label}
                </AppText>
                {option.detail ? (
                  <AppText variant="caption" color="textMuted">
                    {option.detail}
                  </AppText>
                ) : null}
              </View>
              {active ? <Icon name="check" size={18} color="link" bold /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}
