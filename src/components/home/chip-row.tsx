import { View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/theme/use-theme";

type ChipRowProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function ChipRow<T extends string>({ options, value, onChange }: ChipRowProps<T>) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {options.map((option) => (
        <Chip key={option.value} label={option.label} selected={option.value === value} onPress={() => onChange(option.value)} />
      ))}
    </View>
  );
}
