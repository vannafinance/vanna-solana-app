import { ScrollView } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/theme/use-theme";

type VaultTabChipsProps<T extends string> = {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function VaultTabChips<T extends string>({ tabs, value, onChange }: VaultTabChipsProps<T>) {
  const { spacing } = useTheme();

  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
    >
      {tabs.map((tab) => (
        <Chip key={tab.value} label={tab.label} selected={tab.value === value} onPress={() => onChange(tab.value)} />
      ))}
    </ScrollView>
  );
}
