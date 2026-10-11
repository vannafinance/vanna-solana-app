import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

export type AppearanceValue = "system" | "light" | "dark";

type AppearanceCardProps = {
  value: AppearanceValue;
  onChange: (value: AppearanceValue) => void;
};

const options = [
  { value: "system", label: "System default" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function AppearanceCard({ value, onChange }: AppearanceCardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Card padded={false} style={{ paddingBottom: spacing.lg }}>
      <View style={{ height: 44, paddingHorizontal: spacing.lg, justifyContent: "center" }}>
        <AppText variant="caption" strong color="textMuted">
          Appearance
        </AppText>
      </View>
      <View accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          const tone = selected ? colors.link : colors.textMuted;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              android_ripple={ripple(colors.text)}
              onPress={() => onChange(option.value)}
              style={{ height: 52, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.lg }}
            >
              <View style={{ width: 20, height: 20, borderRadius: radius.pill, borderWidth: 2, borderColor: tone, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 10, height: 10, borderRadius: radius.pill, backgroundColor: selected ? colors.link : "transparent" }} />
              </View>
              <AppText variant="bodyLg" style={{ lineHeight: 24 }}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
