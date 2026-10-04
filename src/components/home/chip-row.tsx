import { View } from "react-native";

import { PillTabs } from "@/components/ui/pill-tabs";
import { useTheme } from "@/theme/use-theme";

type ChipRowProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// The same pill tabs as the Earn vault page and the Trade markets, in the Portfolio colour. The tabs carry their own side
// padding, so they run the full width of the page.
export function ChipRow<T extends string>({ options, value, onChange }: ChipRowProps<T>) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ marginHorizontal: -spacing.lg }}>
      <PillTabs segments={options} value={value} onChange={onChange} activeColor={colors.primary} />
    </View>
  );
}
