import { Tabs } from "expo-router";

import { BottomBar } from "@/components/bottom-bar";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BottomBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="portfolio" />
      <Tabs.Screen name="lend" />
      <Tabs.Screen name="margin" />
      <Tabs.Screen name="trade" />
      <Tabs.Screen name="farm" />
      <Tabs.Screen name="earn/pool/[id]" options={{ href: null }} />
    </Tabs>
  );
}
