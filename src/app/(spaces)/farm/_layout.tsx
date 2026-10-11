import { Stack } from "expo-router";

import { detailMotion } from "@/navigation/stack-motion";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function FarmLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...detailMotion }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="close/[id]" options={{ presentation: "transparentModal", animation: "none" }} />
    </Stack>
  );
}
