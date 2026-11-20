import { Tabs, router } from "expo-router";
import { useEffect } from "react";
import { BackHandler, Platform } from "react-native";

import { BottomBar } from "@/components/bottom-bar";
import { toast } from "@/ui/overlay";

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
