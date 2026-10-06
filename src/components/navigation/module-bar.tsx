import { type Href, router, useSegments } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { type Module, modules } from "@/navigation/modules";
import { routes } from "@/navigation/routes";
import { horizontalGradient, type Space, spaceGradients } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// The route name of each module inside the (spaces) navigator.
const routeName: Record<Space, string> = { portfolio: "home", earn: "earn", trade: "trade", farm: "farm" };

const PILL_WIDTH = 56;
const PILL_HEIGHT = 32;
const BAR_PADDING = 8;
// The bar never unmounts, so the active pill can fade across to the new module while the page above switches.
const FADE = { duration: 200, easing: Easing.bezier(0.2, 0, 0, 1) } as const;

type ModuleBarProps = {
  activeRoute: string;
};

function ModuleItem({ module, active }: { module: Module; active: boolean }) {
  const { colors } = useTheme();
  const accent = module.space === "farm" ? colors.farmAccent : module.space === "earn" ? colors.positive : module.space === "portfolio" ? colors.text : colors.link;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={module.label}
      accessibilityState={{ selected: active }}
      android_ripple={{ color: `${accent}22`, borderless: true, radius: 36 }}
      onPress={() => router.navigate(module.href as Href)}
      style={{ flex: 1, alignItems: "center", gap: 4, minHeight: 56 }}
    >
      <View style={{ width: PILL_WIDTH, height: PILL_HEIGHT, alignItems: "center", justifyContent: "center" }}>
        <GradientLayer space={module.space} visible={active} />
        {/* Its own layer above the gradient: on web an absolutely positioned sibling otherwise paints over a plain icon. */}
        <View style={{ zIndex: 1 }}>
          <Icon name={module.icon} size={22} filled={active} color={active ? colors.onHero : colors.textMuted} />
        </View>
      </View>
      <AppText variant="caption" strong={active} numberOfLines={1} style={{ color: active ? accent : colors.textMuted }}>
        {module.label}
      </AppText>
    </Pressable>
  );
}

// Swap is a tool, not a module: a round neutral button between the modules that opens the swap screen over whatever is open.
function SwapAction() {
  const { colors, shadow } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Swap tokens in your wallet"
      onPress={() => router.push(routes.swap as Href)}
      style={{ flex: 1, alignItems: "center", gap: 4, minHeight: 56 }}
    >
      <View style={{ width: 44, height: 44, marginTop: -10, borderRadius: 22, backgroundColor: colors.chipActive, alignItems: "center", justifyContent: "center", ...shadow.pill }}>
        <Icon name="swap_vert" size={22} color={colors.onChipActive} />
      </View>
      <AppText variant="caption" numberOfLines={1} style={{ color: colors.textMuted, marginTop: -2 }}>
        Swap
      </AppText>
    </Pressable>
  );
}

// The fade is worked out in the animated style itself, from `visible`. Setting a shared value from an effect lost the
// update when the app opened straight onto another module (a link to /trade): the Portfolio pill stayed filled.
export function GradientLayer({ space, visible }: { space: Space; visible: boolean }) {
  const style = useAnimatedStyle(() => ({ opacity: withTiming(visible ? 1 : 0, FADE) }), [visible]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: PILL_HEIGHT / 2, overflow: "hidden" }, style]}>
      <LinearGradient colors={spaceGradients[space].nav} {...horizontalGradient} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

// The app's top level. It belongs to the (spaces) navigator, so it stays put while the modules switch above it. A detail
// screen pushed inside a module (a vault, a market, an order, a farm deploy) covers it, as it covered the old page bar.
export function ModuleBar({ activeRoute }: ModuleBarProps) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const onModulePage = useSegments().includes("(tabs)" as never);
  const [first, second, third, fourth] = modules;
  const active = modules.find((module) => routeName[module.space] === activeRoute)?.space ?? "portfolio";

  if (!onModulePage) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.surface,
        borderTopWidth: scheme === "dark" ? 1 : 0,
        borderTopColor: colors.border,
        paddingTop: 12,
        paddingHorizontal: BAR_PADDING,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      <ModuleItem module={first} active={active === first.space} />
      <ModuleItem module={second} active={active === second.space} />
      <SwapAction />
      <ModuleItem module={third} active={active === third.space} />
      <ModuleItem module={fourth} active={active === fourth.space} />
    </View>
  );
}
