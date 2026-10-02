import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import { type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, ScrollView, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ripple } from "./ripple";

type PillTabsProps<T extends string> = {
  segments: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  // The selected pill's fill; the page's own colour for its space.
  activeColor: string;
};

const PILL_HEIGHT = 36;
const PILL_GAP = 8;
const SIDE_PADDING = 20;
const FADE_WIDTH = 72;
const ARROW_SIZE = 32;
const SCROLL_STEP = 160;
// How much of the scrolled edge counts as "still more to see".
const EDGE_SLACK = 2;

type Placement = { x: number; width: number };

// Tabs that scroll sideways and say so: while there is more on a side, that edge fades into the page and shows an arrow
// that moves the row along; at an end the fade and arrow go. Choosing a tab brings it fully into view.
export function PillTabs<T extends string>({ segments, value, onChange, activeColor }: PillTabsProps<T>) {
  const { colors } = useTheme();
  const scroller = useRef<ScrollView>(null);
  const placements = useRef(new Map<T, Placement>());
  const [offset, setOffset] = useState(0);
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);

  const canGoBack = offset > EDGE_SLACK;
  const canGoForward = viewport > 0 && offset + viewport < content - EDGE_SLACK;

  const scrollTo = useCallback((x: number) => scroller.current?.scrollTo({ x: Math.max(0, x), animated: true }), []);

  useEffect(() => {
    const placement = placements.current.get(value);
    if (!placement || viewport === 0) return;
    const index = segments.findIndex((segment) => segment.value === value);
    if (index === 0) scroller.current?.scrollTo({ x: 0, animated: true });
    else if (index === segments.length - 1) scroller.current?.scrollToEnd({ animated: true });
    else scroller.current?.scrollTo({ x: Math.max(0, placement.x - (viewport - placement.width) / 2), animated: true });
  }, [value, viewport, segments]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(event.nativeEvent.contentOffset.x);

  const arrow = (side: "left" | "right") => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={side === "left" ? "Scroll tabs left" : "Scroll tabs right"}
      onPress={() => scrollTo(side === "left" ? offset - SCROLL_STEP : offset + SCROLL_STEP)}
      android_ripple={ripple(colors.text, true)}
      hitSlop={8}
      style={{
        position: "absolute",
        top: (PILL_HEIGHT - ARROW_SIZE) / 2,
        [side]: 12,
        width: ARROW_SIZE,
        height: ARROW_SIZE,
        borderRadius: ARROW_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Icon name="chevron_right" size={18} color="text" rotate={side === "left" ? 180 : undefined} />
    </Pressable>
  );

  return (
    <View style={{ height: PILL_HEIGHT }}>
      <ScrollView
        ref={scroller}
        accessibilityRole="tablist"
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={(event: LayoutChangeEvent) => setViewport(event.nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContent(width)}
        contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, gap: PILL_GAP, alignItems: "center" }}
      >
        {segments.map((segment) => {
          const selected = segment.value === value;
          return (
            <Pressable
              key={segment.value}
              accessibilityRole="tab"
              accessibilityLabel={segment.label}
              accessibilityState={{ selected }}
              android_ripple={ripple(selected ? colors.onPrimary : colors.text)}
              onLayout={(event) => placements.current.set(segment.value, { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width })}
              onPress={() => onChange(segment.value)}
              style={{
                height: PILL_HEIGHT,
                paddingHorizontal: 16,
                borderRadius: PILL_HEIGHT / 2,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                backgroundColor: selected ? activeColor : "transparent",
                borderWidth: 1,
                borderColor: selected ? activeColor : colors.border,
              }}
            >
              <AppText variant="body" strong style={{ color: selected ? colors.onPrimary : colors.text }}>
                {segment.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      {canGoBack ? (
        <>
          <LinearGradient pointerEvents="none" colors={[colors.background, `${colors.background}00`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: FADE_WIDTH }} />
          {arrow("left")}
        </>
      ) : null}
      {canGoForward ? (
        <>
          <LinearGradient pointerEvents="none" colors={[`${colors.background}00`, colors.background]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: FADE_WIDTH }} />
          {arrow("right")}
        </>
      ) : null}
    </View>
  );
}
