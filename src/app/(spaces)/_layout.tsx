import { Tabs } from "expo-router";

import { ModuleBar } from "@/components/navigation/module-bar";
import { NAV_LAYOUT } from "@/navigation/nav-layout";
import { useTheme } from "@/theme/use-theme";

export default function SpacesLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        sceneStyle: { backgroundColor: colors.background },
        // Modules switch in place, with no scene animation. Every module's header has the same geometry, so only colours
        // and figures change; the bottom bar's pill fades across and the page content fades in under the header (Screen).
        // A crossfade of whole scenes is not used: the tab view puts the outgoing scene at zIndex -1, which on web paints it
        // under the container's background, so the switch flashed the page colour.
        animation: "none",
      }}
      tabBar={({ state }) => (NAV_LAYOUT === "bottom-modules" ? <ModuleBar activeRoute={state.routes[state.index].name} /> : null)}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="earn" />
      <Tabs.Screen name="trade" />
      <Tabs.Screen name="farm" />
    </Tabs>
  );
}
