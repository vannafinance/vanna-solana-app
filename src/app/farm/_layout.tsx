import { Stack } from "expo-router";

export default function FarmLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="close/[id]" options={{ presentation: "transparentModal", animation: "none" }} />
    </Stack>
  );
}
