import { View } from "react-native";

import { Chip } from "@/components/ui/chip";

type HistoryChipsProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function HistoryChips<T extends string>({ options, value, onChange }: HistoryChipsProps<T>) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
      {options.map((option) => (
        <Chip key={option.value} check label={option.label} selected={option.value === value} onPress={() => onChange(option.value)} />
      ))}
    </View>
  );
}
