import { Tabs } from "expo-router";
import { Easing } from "react-native";

import { useTheme } from "@/theme/use-theme";

const CROSSFADE_MS = 260;
const OVERLAP = 0.6;

export default function SpacesLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        sceneStyle: { backgroundColor: colors.background },
        transitionSpec: { animation: "timing", config: { duration: CROSSFADE_MS, easing: Easing.inOut(Easing.cubic) } },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            opacity: current.progress.interpolate({ inputRange: [-1, -OVERLAP, 0, OVERLAP, 1], outputRange: [0, 1, 1, 1, 0] }),
          },
        }),
      }}
      tabBar={() => null}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="earn" />
      <Tabs.Screen name="trade" />
      <Tabs.Screen name="farm" />
    </Tabs>
  );
}
