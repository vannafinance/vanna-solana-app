import { View } from "react-native";

import { PillTabs } from "@/components/ui/pill-tabs";
import { useTheme } from "@/theme/use-theme";

type HistoryChipsProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function HistoryChips<T extends string>({ options, value, onChange }: HistoryChipsProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={{ paddingTop: 16, paddingBottom: 12 }}>
      <PillTabs segments={options} value={value} onChange={onChange} activeColor={colors.tradeTab} />
    </View>
  );
}
