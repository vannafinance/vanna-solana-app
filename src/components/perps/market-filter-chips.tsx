import { View } from "react-native";

import { PillTabs } from "@/components/ui/pill-tabs";
import { useTheme } from "@/theme/use-theme";

type MarketFilterChipsProps<T extends string> = {
  filters: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

// The same pill tabs the Earn vault page uses, in the Trade space's colour. The tabs carry their own side padding, so they
// run the full width of the page.
export function MarketFilterChips<T extends string>({ filters, value, onChange }: MarketFilterChipsProps<T>) {
  const { colors, spacing } = useTheme();
  const segments = filters.map((filter) => ({ value: filter, label: filter }));

  return (
    <View style={{ marginHorizontal: -spacing.lg }}>
      <PillTabs segments={segments} value={value} onChange={onChange} activeColor={colors.tradeTab} sidePadding={spacing.lg} />
    </View>
  );
}
