import { Tabs } from "expo-router";

import { ModuleBar } from "@/components/navigation/module-bar";
import { useTheme } from "@/theme/use-theme";

export default function SpacesLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: false,
        sceneStyle: { backgroundColor: colors.background },
        // Modules switch in place with no scene animation: the arriving header blends from the previous module's colours (SpaceHeader)
        // and its content fades in (Screen), while the bottom bar's pill fades across. A crossfade of whole scenes is not used: the tab
        // view drops the outgoing scene at once, so the incoming one would fade in over a bare background.
        animation: "none",
      }}
      tabBar={({ state }) => <ModuleBar activeRoute={state.routes[state.index].name} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="earn" />
      <Tabs.Screen name="trade" />
      <Tabs.Screen name="farm" />
    </Tabs>
  );
}
