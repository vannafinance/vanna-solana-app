import { Stack } from "expo-router";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function FarmLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="close/[id]" options={{ presentation: "transparentModal", animation: "none" }} />
    </Stack>
  );
}
