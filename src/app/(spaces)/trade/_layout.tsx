import { Stack } from "expo-router";

import { detailMotion } from "@/navigation/stack-motion";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function TradeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...detailMotion }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="close/[id]" options={{ presentation: "transparentModal", animation: "fade" }} />
      <Stack.Screen name="add-collateral/[id]" options={{ presentation: "transparentModal", animation: "fade" }} />
    </Stack>
  );
}
