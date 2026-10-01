import { ScrollView } from "react-native";

import { Chip } from "@/components/ui/chip";

type MarketFilterChipsProps<T extends string> = {
  filters: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function MarketFilterChips<T extends string>({ filters, value, onChange }: MarketFilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      accessibilityRole="tablist"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      style={{ marginHorizontal: -16, flexGrow: 0 }}
    >
      {filters.map((filter) => (
        <Chip key={filter} check label={filter} selected={filter === value} onPress={() => onChange(filter)} />
      ))}
    </ScrollView>
  );
}
