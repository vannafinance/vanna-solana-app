import { useIsFocused, useNavigation } from "expo-router";
import { isValidElement, type ReactNode, useLayoutEffect, useMemo, useState, useSyncExternalStore } from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageMotionContext } from "@/navigation/page-motion";
import { getArrival, notePageShown, subscribeArrival } from "@/navigation/page-shown";
import { useResetScrollBetweenSpaces } from "@/navigation/use-reset-scroll-between-spaces";

import { type Space, spaceHeaders } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { SpaceHeader } from "./space-header";

type ScreenProps = {
  header?: ReactNode;
  footer?: ReactNode;
  gap?: number;
  paddingTop?: number;
  children: ReactNode;
};

// How far the page scrolls before the status bar backing is fully shown.
const SCRIM_SCROLL = 32;
// A module page that comes into view fades in; one of the same module also slides in a little, from the side it sits on in the page
// bar. The header blends from the previous module's colours (see SpaceHeader) while its figures fade in with the content.
const REVEAL = { duration: 340, easing: Easing.bezier(0.2, 0, 0, 1) } as const;
const SLIDE_PX = 36;

type Nav = {
  getParent: () => Nav | undefined;
  getState: () => { type?: string; key?: string; index: number; routes: { state?: { key?: string } }[] } | undefined;
};

// Whether a screen has been pushed over this one in a stack above it (a market, an order, Swap), as opposed to another page being chosen.
function coveredByPushedScreen(navigation: Nav) {
  let current: Nav | undefined = navigation;
  while (current) {
    const parent: Nav | undefined = current.getParent();
    const parentState = parent?.getState();
    const ownKey = current.getState()?.key;
    if (parentState?.type === "stack" && parentState.routes[parentState.index]?.state?.key !== ownKey) return true;
    current = parent;
  }
  return false;
}

function headerSpace(header: ReactNode): Space | null {
  return isValidElement<{ space: Space }>(header) && header.type === SpaceHeader ? header.props.space : null;
}

export function Screen({ header, footer, gap, paddingTop, children }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useSharedValue(0);
  const listRef = useResetScrollBetweenSpaces();
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scroll.value = event.nativeEvent.contentOffset.y;
  };
  const scrim = useAnimatedStyle(() => ({ opacity: interpolate(scroll.value, [0, SCRIM_SCROLL], [0, 1], "clamp") }));
  const space = headerSpace(header);
  const navigation = useNavigation();
  const focused = useIsFocused();
  const [page] = useState(() => ({}));
  // A page that is not showing waits at 0, so the moment it is chosen it is already invisible and fades in, instead of flashing at full
  // strength for a frame first.
  const reveal = useSharedValue(focused ? 1 : 0);
  const slide = useSharedValue(0);
  const arrival = useSyncExternalStore(subscribeArrival, getArrival);
  const change = arrival !== null && arrival.page === page ? arrival.change : null;
  const motion = useMemo(
    () => ({ reveal, from: change?.kind === "module" ? change.from : null, fromIndex: change?.kind === "page" ? change.fromIndex : null }),
    [reveal, change],
  );
  const contentStyle = useAnimatedStyle(() => ({ opacity: reveal.get() }));
  const slideIn = useAnimatedStyle(() => ({ transform: [{ translateX: slide.get() }] }));

  useLayoutEffect(() => {
    if (space === null || !focused) return undefined;
    const arrived = notePageShown(page, space, navigation.getState()?.index ?? 0);
    if (arrived.kind === "none") {
      reveal.set(1);
      slide.set(0);
    } else {
      reveal.set(0);
      slide.set(arrived.kind === "page" ? arrived.direction * SLIDE_PX : 0);
      reveal.set(withTiming(1, REVEAL));
      slide.set(withTiming(0, REVEAL));
    }
    // Leaving for another page parks this one hidden; a detail screen opened over it leaves it as it is.
    return () => {
      if (!coveredByPushedScreen(navigation as unknown as Nav)) reveal.set(0);
    };
  }, [focused, space, navigation, page, reveal, slide]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={listRef}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        <PageMotionContext.Provider value={motion}>{header}</PageMotionContext.Provider>
        <Animated.View style={[{ padding: spacing.lg, paddingTop: paddingTop ?? spacing.lg, gap: gap ?? spacing.lg }, contentStyle, slideIn]}>{children}</Animated.View>
      </ScrollView>
      {space === null ? null : (
        // The gradient header scrolls away but the status bar keeps its light icons, so once content slides under it, it is
        // backed by the header's own colour.
        <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: spaceHeaders[space].scrim }, scrim]} />
      )}
      {footer ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom, spacing.lg) }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}
