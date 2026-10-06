import { router, Tabs, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

import { SpaceTabBar } from "@/components/ui/space-tab-bar";
import { moduleFor } from "@/navigation/modules";
import { PAGES_IN_BOTTOM_BAR } from "@/navigation/nav-layout";
import { spaceRoutes } from "@/navigation/routes";
import type { Space } from "@/theme/tokens";

type SpaceTabsLayoutProps = {
  space: Space;
};

// A module's pages, from `navigation/modules`. Each page `key` is the route file name inside the (tabs) group, for example
// "index" or "positions". With the modules in the bottom bar, the pages are switched from the pill bar in the module's
// header (SpaceHeader) and this navigator draws no bar; with the modules on top, this navigator's bottom bar holds the pages.
// Back from any page of a module other than Portfolio returns to Portfolio; Back on Portfolio exits.
export function SpaceTabsLayout({ space }: SpaceTabsLayoutProps) {
  useFocusEffect(
    useCallback(() => {
      if (space === "portfolio") return undefined;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.navigate(spaceRoutes.portfolio);
        return true;
      });
      return () => subscription.remove();
    }, [space]),
  );

  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: "none", lazy: false }}
      tabBar={({ state, navigation }) =>
        PAGES_IN_BOTTOM_BAR ? (
          <SpaceTabBar space={space} tabs={moduleFor(space).pages} activeKey={state.routes[state.index].name} onSelect={(key) => navigation.navigate(key)} />
        ) : null
      }
    >
      {moduleFor(space).pages.map((page) => (
        <Tabs.Screen key={page.key} name={page.key} />
      ))}
    </Tabs>
  );
}
