import { Stack } from "expo-router";

export default function TradeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="close/[id]" options={{ presentation: "transparentModal", animation: "fade" }} />
      <Stack.Screen name="add-collateral/[id]" options={{ presentation: "transparentModal", animation: "fade" }} />
    </Stack>
  );
}
