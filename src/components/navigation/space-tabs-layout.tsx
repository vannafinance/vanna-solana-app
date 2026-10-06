import { router, Tabs, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

import { moduleFor } from "@/navigation/modules";
import { spaceRoutes } from "@/navigation/routes";
import type { Space } from "@/theme/tokens";

type SpaceTabsLayoutProps = {
  space: Space;
};

// A module's pages, from `navigation/modules`. Each page `key` is the route file name inside the (tabs) group, for example
// "index" or "positions". The pages are switched from the pill bar in the module's header (SpaceHeader), so this navigator
// draws no bar; the modules themselves are in the bottom bar (ModuleBar).
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
      tabBar={() => null}
    >
      {moduleFor(space).pages.map((page) => (
        <Tabs.Screen key={page.key} name={page.key} />
      ))}
    </Tabs>
  );
}
