import { Pressable, View } from "react-native";

import { AnchoredMenu } from "@/components/perps/anchored-menu";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";
import type { SwapRoute, SwapRouteId } from "@/types/swap";

type RouteMenuProps = {
  routes: readonly SwapRoute[];
  selected: SwapRoute;
  onSelect: (id: SwapRouteId) => void;
};

export function RouteMenu({ routes, selected, onSelect }: RouteMenuProps) {
  const { colors, radius } = useTheme();

  return (
    <AnchoredMenu
      label="Route"
      width={260}
      radius={18}
      padding={6}
      renderTrigger={({ open, toggle }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Swap route, via ${selected.label}`}
          accessibilityState={{ expanded: open }}
          android_ripple={ripple(colors.text)}
          onPress={toggle}
          style={{
            height: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingLeft: 14,
            paddingRight: 12,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: open ? colors.primary : colors.border,
            backgroundColor: colors.surface,
            overflow: "hidden",
          }}
        >
          <AppText variant="body" color="textMuted">
            via
          </AppText>
          <AppText variant="body" strong>
            {selected.label}
          </AppText>
          <Icon name="keyboard_arrow_down" size={14} color="text" rotate={open ? 180 : undefined} />
        </Pressable>
      )}
    >
      {(close) =>
        routes.map((route) => {
          const active = route.id === selected.id;
          return (
            <Pressable
              key={route.id}
              accessibilityRole="button"
              accessibilityLabel={route.available ? route.label : `${route.label}, coming soon`}
              accessibilityState={{ selected: active, disabled: !route.available }}
              disabled={!route.available}
              android_ripple={ripple(colors.text)}
              onPress={() => {
                onSelect(route.id);
                close();
              }}
              style={{
                height: 56,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 10,
                borderRadius: radius.sm,
                overflow: "hidden",
                backgroundColor: active ? colors.purpleTint : "transparent",
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="body" strong color={route.available ? "text" : "textMuted"}>
                  {route.label}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {route.description}
                </AppText>
              </View>
              {active ? <Icon name="check" size={18} color="link" bold /> : null}
              {route.available ? null : (
                <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: colors.background, justifyContent: "center" }}>
                  <AppText variant="caption" strong>
                    Soon
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })
      }
    </AnchoredMenu>
  );
}
