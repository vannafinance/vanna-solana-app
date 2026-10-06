import { Stack } from "expo-router";

import { detailMotion } from "@/navigation/stack-motion";

export const unstable_settings = { initialRouteName: "(tabs)" };

export default function HomeLayout() {
  return <Stack screenOptions={{ headerShown: false, ...detailMotion }} />;
}
