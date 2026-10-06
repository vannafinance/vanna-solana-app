import { type Href, router, useSegments } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { moduleFor } from "@/navigation/modules";
import { horizontalGradient, type Space, spaceGradients, spaceHeaders } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { MODULE_HERO_HEIGHT } from "./module-hero";
import { ripple } from "./ripple";
import { TokenIcon } from "./token-icon";
import { VannaMark } from "./vanna-mark";
import { VannaWordmark } from "./vanna-wordmark";

// Half of the switcher sits over the bottom edge of the header; the rest of the header makes room for it.
const OVERLAP = 28;
const ISLAND_HEIGHT = 56;
const ISLAND_PADDING = 6;
const ISLAND_MAX_WIDTH = 520;
const SURFACE_STOPS = [0, 0.42, 1] as const;

type SpaceHeaderProps = {
  space: Space;
  notificationCount?: number;
  onNotifications: () => void;
  onAvatar: () => void;
  avatar?: ReactNode;
  children?: ReactNode;
};

function Glow({ color }: { color: string }) {
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="spaceGlow" cx="100%" cy="0%" rx="110%" ry="70%">
          <Stop offset="0" stopColor={color} />
          <Stop offset="0.6" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#spaceGlow)" />
    </Svg>
  );
}

// The module's own pages as a white bar floating over the header's bottom edge; the current page is filled with the module's
// gradient. The modules themselves live in the bottom bar.
function activePage(segments: readonly string[], space: Space) {
  const named = segments.filter((segment) => !segment.startsWith("("));
  return named.length > 1 ? named[1] : moduleFor(space).pages[0].key;
}

function PageIsland({ space }: { space: Space }) {
  const { colors, shadow } = useTheme();
  const segments = useSegments();
  const module = moduleFor(space);
  const current = activePage(segments, space);

  return (
    <View style={{ marginTop: -OVERLAP, paddingHorizontal: 16 }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={`${module.label} pages`}
        style={[
          { alignSelf: "center", width: "100%", maxWidth: ISLAND_MAX_WIDTH, height: ISLAND_HEIGHT, padding: ISLAND_PADDING, flexDirection: "row", borderRadius: ISLAND_HEIGHT / 2, backgroundColor: colors.surface },
          shadow.floating,
        ]}
      >
        {module.pages.map((page) => {
          const selected = page.key === current;
          const href = page.key === module.pages[0].key ? module.href : `${module.href}/${page.key}`;
          return (
            <Pressable
              key={page.key}
              accessibilityRole="tab"
              accessibilityLabel={page.label}
              accessibilityState={{ selected }}
              android_ripple={selected ? undefined : ripple(colors.text)}
              onPress={() => !selected && router.navigate(href as Href)}
              style={[{ flex: 1, borderRadius: ISLAND_HEIGHT / 2 - ISLAND_PADDING, overflow: "hidden", alignItems: "center", justifyContent: "center" }, selected ? shadow.pill : null]}
            >
              {selected ? <LinearGradient colors={spaceGradients[space].nav} {...horizontalGradient} style={StyleSheet.absoluteFill} /> : null}
              <AppText strong numberOfLines={1} style={{ fontSize: 14, lineHeight: 20, color: selected ? colors.onHero : colors.textMuted }}>
                {page.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SpaceHeader({ space, notificationCount = 0, onNotifications, onAvatar, avatar = <TokenIcon symbol="SOL" size={40} />, children }: SpaceHeaderProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const header: { surface: readonly string[]; glow: string; start?: { x: number; y: number }; end?: { x: number; y: number } } = spaceHeaders[space];
  const { surface, glow } = header;

  return (
    <View>
      <StatusBar style="light" />
      <View style={{ overflow: "hidden", borderBottomLeftRadius: radius.hero, borderBottomRightRadius: radius.hero }}>
        <LinearGradient colors={surface as [string, string, string]} locations={SURFACE_STOPS} start={header.start} end={header.end} style={StyleSheet.absoluteFill} />
        <Glow color={glow} />
        <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: spacing.xs }}>
            <View accessibilityLabel="Vanna" style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <VannaMark size={30} />
              <VannaWordmark color={colors.onHero} height={17} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={onNotifications}
              hitSlop={8}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: spacing.sm }}
            >
              <Icon name="notifications" size={24} color="onHero" />
              {notificationCount > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 2,
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: 4,
                    borderRadius: radius.pill,
                    backgroundColor: colors.badge,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText variant="caption" strong color="onHero" style={{ fontSize: 11, lineHeight: 14 }}>
                    {notificationCount}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={onAvatar}
              style={{ width: 44, height: 44, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.heroDivider, overflow: "hidden" }}
            >
              {avatar}
            </Pressable>
          </View>
        </View>
        {/* Every module's header body is the same height (see ModuleHero), so the page bar sits at the same place in each. */}
        <View style={{ height: MODULE_HERO_HEIGHT + 6 + 20 + OVERLAP, paddingHorizontal: spacing.lg, paddingTop: 6, paddingBottom: 20 + OVERLAP }}>{children}</View>
      </View>
      <PageIsland space={space} />
    </View>
  );
}
