import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type StepHeaderProps = {
  step: number;
  title: string;
  subtitle: string;
};

export function StepHeader({ step, title, subtitle }: StepHeaderProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <LinearGradient
        colors={[colors.short, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 32, height: 32, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" }}
      >
        <AppText variant="body" strong color="onHero">
          {String(step)}
        </AppText>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <AppText variant="title" strong>
          {title}
        </AppText>
        <AppText variant="body" color="textMuted" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}
