import { Stack } from "expo-router";

import { useTheme } from "@/theme/use-theme";

// Farm keeps its own stack so the bottom bar stays on detail screens (design V4 N3).
export default function FarmLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, animation: "ios_from_right", contentStyle: { backgroundColor: colors.bg } }} />;
}
