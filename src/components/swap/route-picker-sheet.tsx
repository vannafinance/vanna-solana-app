import { Check } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useTheme } from "@/theme/use-theme";
import type { SwapRoute, SwapRouteId } from "@/types/swap";

type RoutePickerSheetProps = {
  visible: boolean;
  routes: readonly SwapRoute[];
  selected: SwapRouteId;
  onSelect: (id: SwapRouteId) => void;
  onDismiss: () => void;
};

export function RoutePickerSheet({ visible, routes, selected, onSelect, onDismiss }: RoutePickerSheetProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <AppText variant="title" style={{ marginBottom: spacing.sm }}>
        Swap route
      </AppText>
      {routes.map((route) => {
        const active = route.id === selected;
        return (
          <Pressable
            key={route.id}
            accessibilityRole="button"
            accessibilityLabel={route.available ? route.label : `${route.label}, coming soon`}
            accessibilityState={{ selected: active, disabled: !route.available }}
            disabled={!route.available}
            onPress={() => {
              onSelect(route.id);
              onDismiss();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              minHeight: 64,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              backgroundColor: active ? colors.purpleTint : "transparent",
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="bodyLg" strong>
                {route.label}
              </AppText>
              <AppText variant="label" color="textMuted">
                {route.description}
              </AppText>
            </View>
            {active ? <Check size={20} color={colors.primary} weight="bold" /> : null}
            {route.available ? null : (
              <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.segment }}>
                <AppText variant="label" color="textMuted" strong>
                  Soon
                </AppText>
              </View>
            )}
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}
