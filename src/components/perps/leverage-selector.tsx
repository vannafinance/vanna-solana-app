import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

type LeverageSelectorProps = {
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
};

export function LeverageSelector({ options, value, onChange }: LeverageSelectorProps) {
  return (
    <Card>
      <AppText variant="caption" color="textMuted">
        Leverage
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel="Leverage" style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {options.map((option) => (
          <Chip key={option} flex shape="pill" label={`${option}x`} selected={option === value} onPress={() => onChange(option)} />
        ))}
      </View>
    </Card>
  );
}
