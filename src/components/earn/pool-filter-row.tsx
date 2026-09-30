import { CaretDown } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { OptionSheet } from "@/components/ui/option-sheet";
import { useTheme } from "@/theme/use-theme";
import type { PoolFilterOption } from "@/types/earn";

type PoolFilterRowProps = {
  options: readonly PoolFilterOption[];
  value: PoolFilterOption["value"];
  onChange: (value: PoolFilterOption["value"]) => void;
};

function labelFor(value: PoolFilterOption["value"]) {
  return value === "all" ? "All pools" : value;
}

export function PoolFilterRow({ options, value, onChange }: PoolFilterRowProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, paddingBottom: spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pool filter, ${labelFor(value)} selected`}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          minHeight: 44,
          paddingLeft: spacing.lg,
          paddingRight: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <AppText strong>{labelFor(value)}</AppText>
        <CaretDown size={16} color={colors.text} />
      </Pressable>
      <AppText variant="caption" color="textMuted">
        Sorted by supply APY
      </AppText>
      <OptionSheet
        visible={open}
        title="Pools"
        options={options.map((option) => ({ value: option.value, label: labelFor(option.value), detail: `${option.count} vaults` }))}
        selected={value}
        onSelect={onChange}
        onDismiss={() => setOpen(false)}
      />
    </View>
  );
}
