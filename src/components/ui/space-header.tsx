import { type Href, router, useSegments } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useContext, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { moduleFor, modules } from "@/navigation/modules";
import { NAV_LAYOUT } from "@/navigation/nav-layout";
import { PageMotionContext } from "@/navigation/page-motion";
import { routes } from "@/navigation/routes";
import { horizontalGradient, type Space, spaceGradients, spaceHeaders, spaceInk } from "@/theme/tokens";
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

function Glow({ color, id = "spaceGlow" }: { color: string; id?: string }) {
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="100%" cy="0%" rx="110%" ry="70%">
          <Stop offset="0" stopColor={color} />
          <Stop offset="0.6" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

// A deep shade in the top-left corner, behind the Vanna logo: the logo's coral and purple are the hues of these headers, so the
// logo gets a darker ground to stand on while it keeps its real colours.
function LogoShade() {
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="logoShade" cx="0%" cy="0%" rx="85%" ry="40%">
          <Stop offset="0" stopColor="#0E001F" stopOpacity={0.95} />
          <Stop offset="0.35" stopColor="#0E001F" stopOpacity={0.82} />
          <Stop offset="0.7" stopColor="#0E001F" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#0E001F" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#logoShade)" />
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
  const currentIndex = Math.max(
    0,
    module.pages.findIndex((page) => page.key === current),
  );
  // The highlight is one shape that slides from the page the user came from to this one, as the page arrives.
  const motion = useContext(PageMotionContext);
  const [inner, setInner] = useState(0);
  const itemWidth = inner / module.pages.length;
  const fromIndex = motion.fromIndex ?? currentIndex;
  const glide = useAnimatedStyle(() => {
    const progress = motion.reveal === null ? 1 : motion.reveal.get();
    return { transform: [{ translateX: (fromIndex + (currentIndex - fromIndex) * progress) * itemWidth }] };
  });

  return (
    <View style={{ marginTop: -OVERLAP, paddingHorizontal: 16 }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={`${module.label} pages`}
        onLayout={(event) => setInner(event.nativeEvent.layout.width - ISLAND_PADDING * 2)}
        style={[
          { alignSelf: "center", width: "100%", maxWidth: ISLAND_MAX_WIDTH, height: ISLAND_HEIGHT, padding: ISLAND_PADDING, flexDirection: "row", borderRadius: ISLAND_HEIGHT / 2, backgroundColor: colors.surface },
          shadow.floating,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", left: ISLAND_PADDING, top: ISLAND_PADDING, bottom: ISLAND_PADDING, width: itemWidth, borderRadius: ISLAND_HEIGHT / 2 - ISLAND_PADDING, overflow: "hidden" },
            shadow.pill,
            glide,
          ]}
        >
          <LinearGradient colors={spaceGradients[space].nav} {...horizontalGradient} style={StyleSheet.absoluteFill} />
        </Animated.View>
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
              style={{ flex: 1, borderRadius: ISLAND_HEIGHT / 2 - ISLAND_PADDING, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
            >
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

// The other layout (NAV_LAYOUT "top-modules", the original app's): the four modules in the white bar over the header's bottom
// edge, with Swap as a round button in its middle; the current module is filled with its gradient. The module's pages are
// then the bottom bar.
function ModuleIsland({ space }: { space: Space }) {
  const { colors, shadow } = useTheme();
  const [first, second, third, fourth] = modules;

  const tab = (module: (typeof modules)[number]) => {
    const selected = module.space === space;
    return (
      <Pressable
        key={module.space}
        accessibilityRole="tab"
        accessibilityLabel={module.label}
        accessibilityState={{ selected }}
        android_ripple={selected ? undefined : ripple(colors.text)}
        onPress={() => !selected && router.navigate(module.href as Href)}
        // Tabs size to their labels ("Margin trade" is longer than "Earn"), sharing what is left equally.
        style={[{ flexGrow: 1, flexShrink: 1, flexBasis: "auto", paddingHorizontal: 8, borderRadius: ISLAND_HEIGHT / 2 - ISLAND_PADDING, overflow: "hidden", alignItems: "center", justifyContent: "center" }, selected ? shadow.pill : null]}
      >
        {selected ? <LinearGradient colors={spaceGradients[module.space].nav} {...horizontalGradient} style={StyleSheet.absoluteFill} /> : null}
        <AppText strong numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: selected ? colors.onHero : colors.textMuted }}>
          {module.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View style={{ marginTop: -OVERLAP, paddingHorizontal: 16 }}>
      <View
        accessibilityRole="tablist"
        style={[
          { alignSelf: "center", width: "100%", maxWidth: ISLAND_MAX_WIDTH, height: ISLAND_HEIGHT, padding: ISLAND_PADDING, flexDirection: "row", gap: 2, borderRadius: ISLAND_HEIGHT / 2, backgroundColor: colors.surface },
          shadow.floating,
        ]}
      >
        {tab(first)}
        {tab(second)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Swap tokens in your wallet"
          onPress={() => router.push(routes.swap as Href)}
          style={{ alignSelf: "center", width: ISLAND_HEIGHT - ISLAND_PADDING * 2, height: ISLAND_HEIGHT - ISLAND_PADDING * 2, marginHorizontal: 2, borderRadius: ISLAND_HEIGHT, backgroundColor: colors.chipActive, alignItems: "center", justifyContent: "center" }}
        >
          <View style={{ zIndex: 1 }}>
            <Icon name="swap_vert" size={22} color={colors.onChipActive} />
          </View>
        </Pressable>
        {tab(third)}
        {tab(fourth)}
      </View>
    </View>
  );
}

// V4 (NAV_LAYOUT "header-modules"): the four modules as a glass bar inside the header, under the Vanna logo, with Swap as a
// round button in its middle. The current module is a white pill in the module's colour. The module's pages are the bottom bar.
const HEADER_BAR = 44;
const HEADER_BAR_PADDING = 4;

function HeaderModules({ space }: { space: Space }) {
  const { colors } = useTheme();
  const [first, second, third, fourth] = modules;

  const tab = (module: (typeof modules)[number]) => {
    const selected = module.space === space;
    return (
      <Pressable
        key={module.space}
        accessibilityRole="tab"
        accessibilityLabel={module.label}
        accessibilityState={{ selected }}
        android_ripple={selected ? undefined : ripple(colors.onHero)}
        onPress={() => !selected && router.navigate(module.href as Href)}
        style={{ flexGrow: 1, flexShrink: 1, flexBasis: "auto", paddingHorizontal: 8, borderRadius: HEADER_BAR / 2, alignItems: "center", justifyContent: "center", backgroundColor: selected ? colors.onHero : "transparent" }}
      >
        <AppText strong numberOfLines={1} style={{ fontSize: 13, lineHeight: 18, color: selected ? spaceInk[module.space] : colors.onHero }}>
          {module.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", gap: 2, height: HEADER_BAR, padding: HEADER_BAR_PADDING, borderRadius: HEADER_BAR / 2, backgroundColor: colors.heroGlass }}
    >
      {tab(first)}
      {tab(second)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Swap tokens in your wallet"
        onPress={() => router.push(routes.swap as Href)}
        style={{ alignSelf: "center", width: HEADER_BAR - HEADER_BAR_PADDING * 2, height: HEADER_BAR - HEADER_BAR_PADDING * 2, marginHorizontal: 2, borderRadius: HEADER_BAR, backgroundColor: colors.engraved, alignItems: "center", justifyContent: "center" }}
      >
        <View style={{ zIndex: 1 }}>
          <Icon name="swap_vert" size={20} color={colors.onHero} />
        </View>
      </Pressable>
      {tab(third)}
      {tab(fourth)}
    </View>
  );
}

export function SpaceHeader({ space, notificationCount = 0, onNotifications, onAvatar, avatar = <TokenIcon symbol="SOL" size={40} />, children }: SpaceHeaderProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const header: { surface: readonly string[]; glow: string; start?: { x: number; y: number }; end?: { x: number; y: number } } = spaceHeaders[space];
  const { surface, glow } = header;
  // Arriving from another module, the header starts in that module's colours and blends into its own while its figures fade in.
  const motion = useContext(PageMotionContext);
  const previous: typeof header | null = motion.from !== null && motion.from !== space ? spaceHeaders[motion.from] : null;
  const arrive = useAnimatedStyle(() => ({ opacity: previous !== null && motion.reveal !== null ? motion.reveal.get() : 1 }));
  const figures = useAnimatedStyle(() => ({ opacity: motion.reveal !== null ? motion.reveal.get() : 1 }));

  return (
    <View>
      <StatusBar style="light" />
      <View style={{ overflow: "hidden", borderBottomLeftRadius: radius.hero, borderBottomRightRadius: radius.hero }}>
        {previous === null ? null : (
          <>
            <LinearGradient colors={previous.surface as [string, string, string]} locations={SURFACE_STOPS} start={previous.start} end={previous.end} style={StyleSheet.absoluteFill} />
            <Glow color={previous.glow} id="spaceGlowFrom" />
          </>
        )}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, arrive]}>
          <LinearGradient colors={surface as [string, string, string]} locations={SURFACE_STOPS} start={header.start} end={header.end} style={StyleSheet.absoluteFill} />
          <Glow color={glow} />
        </Animated.View>
        <LogoShade />
        <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: spacing.xs }}>
            <View accessibilityLabel="Vanna" style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <VannaMark size={30} tone="logo" />
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
          {NAV_LAYOUT === "header-modules" ? (
            <View style={{ paddingHorizontal: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.sm }}>
              <HeaderModules space={space} />
            </View>
          ) : null}
        </View>
        {/* Every module's header body is the same height (see ModuleHero), so the bars sit at the same place in each. With the
            modules inside the header (V4) nothing floats over its bottom edge, so the body ends with plain padding. */}
        {NAV_LAYOUT === "header-modules" ? (
          <Animated.View style={[{ height: MODULE_HERO_HEIGHT + 6 + 20, paddingHorizontal: spacing.lg, paddingTop: 6, paddingBottom: 20 }, figures]}>{children}</Animated.View>
        ) : (
          <Animated.View style={[{ height: MODULE_HERO_HEIGHT + 6 + 20 + OVERLAP, paddingHorizontal: spacing.lg, paddingTop: 6, paddingBottom: 20 + OVERLAP }, figures]}>{children}</Animated.View>
        )}
      </View>
      {NAV_LAYOUT === "top-modules" ? <ModuleIsland space={space} /> : NAV_LAYOUT === "bottom-modules" ? <PageIsland space={space} /> : null}
    </View>
  );
}
