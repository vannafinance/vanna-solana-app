import { ScrollView } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/theme/use-theme";

type MarketFilterChipsProps<T extends string> = {
  filters: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function MarketFilterChips<T extends string>({ filters, value, onChange }: MarketFilterChipsProps<T>) {
  const { spacing } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
      style={{ marginHorizontal: -spacing.lg, flexGrow: 0 }}
    >
      {filters.map((filter) => (
        <Chip key={filter} label={filter} selected={filter === value} onPress={() => onChange(filter)} />
      ))}
    </ScrollView>
  );
}
