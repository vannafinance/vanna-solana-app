import { router, Tabs, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

import { SpaceTabBar, type SpaceTab } from "@/components/ui/space-tab-bar";
import { spaceRoutes } from "@/navigation/routes";
import type { Space } from "@/theme/tokens";

type SpaceTabsLayoutProps = {
  space: Space;
  tabs: readonly SpaceTab[];
};

// Each tab `key` is the route file name inside the (tabs) group, for example "index" or "positions".
// Back from any tab of a space other than Portfolio returns to Portfolio; Back on Portfolio exits.
export function SpaceTabsLayout({ space, tabs }: SpaceTabsLayoutProps) {
  useFocusEffect(
    useCallback(() => {
      if (space === "portfolio") return undefined;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace(spaceRoutes.portfolio);
        return true;
      });
      return () => subscription.remove();
    }, [space]),
  );

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <SpaceTabBar
          space={space}
          tabs={tabs}
          activeKey={state.routes[state.index].name}
          onSelect={(key) => navigation.navigate(key)}
        />
      )}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.key} />
      ))}
    </Tabs>
  );
}
