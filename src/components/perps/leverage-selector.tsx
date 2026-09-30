import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/theme/use-theme";

type LeverageSelectorProps = {
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
  summary: string;
};

export function LeverageSelector({ options, value, onChange, summary }: LeverageSelectorProps) {
  const { spacing } = useTheme();

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="body" color="textMuted">
            Leverage
          </AppText>
          <AppText variant="body" strong>
            {summary}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {options.map((option) => (
            <Chip key={option} flex label={`${option}x`} selected={option === value} onPress={() => onChange(option)} />
          ))}
        </View>
      </View>
    </Card>
  );
}
