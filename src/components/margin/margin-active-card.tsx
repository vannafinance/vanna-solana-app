import { View } from "react-native";
import Animated, { Easing, FadeInUp, ZoomIn } from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/use-theme";

type MarginActiveCardProps = { address: string };

export function MarginActiveCard({ address }: MarginActiveCardProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInUp.duration(320)}>
      <Card padded={false} style={{ paddingVertical: 24, paddingHorizontal: 16, alignItems: "center" }}>
        <Animated.View
          entering={ZoomIn.duration(520).easing(Easing.bezier(0.34, 1.56, 0.64, 1))}
          style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.badgePositive, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="check" size={36} color="onPrimary" bold />
        </Animated.View>
        <AppText variant="heading" style={{ marginTop: 16 }}>
          Margin account active
        </AppText>
        <View style={{ marginTop: 4 }}>
          <AppText variant="body" color="textMuted" style={{ textAlign: "center" }}>
            {"Account "}
            <AppText variant="body" color="textMuted" style={{ fontFamily: "monospace" }}>
              {address}
            </AppText>
            {". Add collateral to open your first position."}
          </AppText>
        </View>
      </Card>
    </Animated.View>
  );
}
