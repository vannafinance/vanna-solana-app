import type { BottomTabBarProps } from "expo-router/tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";
import { BRAND_GRADIENT, families, type FamilyName, font } from "@/theme/tokens";

import { VannaMark } from "./brand";
import { Icon } from "./ui/icon";
import type { IconName } from "./ui/material-symbols";

// The design's five bottom bar groups (core.js GROUPS). Margin is the centre button: the brand gradient with the white Vanna mark.
const GROUPS: Record<string, { label: string; icon: IconName; family: FamilyName; centre?: boolean }> = {
  portfolio: { label: "Portfolio", icon: "pie_chart", family: "portfolio" },
  lend: { label: "Lend", icon: "savings", family: "earn" },
  margin: { label: "Margin", icon: "account_balance", family: "margin", centre: true },
  trade: { label: "Trade", icon: "candlestick_chart", family: "spot" },
  farm: { label: "Farm", icon: "eco", family: "farm" },
};

const STD = Easing.bezier(0.2, 0, 0, 1);

// The active indicator fades in (200 ms) as in the design.
function Indicator({ on, colors: c }: { on: boolean; colors: readonly [string, string] }) {
  const o = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    o.value = withTiming(on ? 1 : 0, { duration: 200, easing: STD });
  }, [on, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]}>
      <LinearGradient colors={c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

function Centre({ on }: { on: boolean }) {
  const s = useSharedValue(on ? 1.06 : 1);
  useEffect(() => {
    s.value = withTiming(on ? 1.06 : 1, { duration: 200, easing: STD });
  }, [on, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.centre, on && styles.centreOn, st]}>
      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={[StyleSheet.absoluteFill, { borderRadius: 26 }]} />
      <View style={styles.glyph}>
        <VannaMark size={24} tone="white" />
      </View>
    </Animated.View>
  );
}

export function BottomBar({ state, navigateToTab }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 14), borderTopWidth: isDark ? 1 : 0, borderTopColor: colors.border },
      ]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const group = GROUPS[route.name];
        if (!group) return null;
        const on = state.index === index;
        const fam = families[group.family];

        return (
          <Pressable
            key={route.key}
            onPress={() => navigateToTab(route.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={group.label}
            style={styles.item}
          >
            {group.centre ? (
              <Centre on={on} />
            ) : (
              <View style={styles.indicator}>
                <Indicator on={on} colors={fam.n} />
                <View style={styles.glyph}>
                  <Icon name={group.icon} size={24} color={on ? "#FFFFFF" : colors.muted} filled={on} />
                </View>
              </View>
            )}
            <Text
              style={[
                styles.label,
                {
                  color: on ? (group.centre ? colors.text : fam.acc[isDark ? 1 : 0]) : colors.muted,
                  fontFamily: on ? font.semibold : font.regular,
                },
              ]}
            >
              {group.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "flex-start", paddingTop: 10, paddingHorizontal: 8 },
  item: { flex: 1, minHeight: 56, alignItems: "center", gap: 4 },
  indicator: { width: 56, height: 32, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  centre: {
    width: 52, height: 52, marginTop: -20, borderRadius: 26, alignItems: "center", justifyContent: "center",
    shadowColor: "#703AE6", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  centreOn: { shadowOpacity: 0.38, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
  // above the absolutely filled gradient (web paints positioned elements over static ones)
  glyph: { zIndex: 1 },
  label: { fontSize: 12, lineHeight: 16 },
});
