import { Pressable, ScrollView, View } from "react-native";

import { palette } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { ripple } from "./ripple";

type Segment<T extends string> = { value: T; label: string; badge?: string };

type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "tabs" | "buttons";
  tone?: "surface" | "hero";
  activeColor?: string;
  dense?: boolean;
  scrollable?: boolean;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  variant,
  tone = "surface",
  activeColor,
  dense = false,
  scrollable = false,
}: SegmentedControlProps<T>) {
  if (tone === "hero") return <HeroSegments segments={segments} value={value} onChange={onChange} />;
  if ((variant ?? (activeColor ? "buttons" : "tabs")) === "buttons") {
    return <ButtonSegments segments={segments} value={value} onChange={onChange} activeColor={activeColor} dense={dense} />;
  }
  return <TabSegments segments={segments} value={value} onChange={onChange} dense={dense} scrollable={scrollable} />;
}

type PartProps<T extends string> = Pick<SegmentedControlProps<T>, "segments" | "value" | "onChange">;

function TabSegments<T extends string>({
  segments,
  value,
  onChange,
  dense,
  scrollable,
}: PartProps<T> & { dense: boolean; scrollable: boolean }) {
  const { colors } = useTheme();
  const height = dense ? 44 : 48;

  const tabs = segments.map((segment) => {
    const selected = segment.value === value;
    return (
      <Pressable
        key={segment.value}
        accessibilityRole="tab"
        accessibilityLabel={segment.label}
        accessibilityState={{ selected }}
        android_ripple={ripple(colors.text)}
        onPress={() => onChange(segment.value)}
        style={{
          flex: scrollable ? undefined : 1,
          height,
          paddingHorizontal: scrollable ? 16 : 0,
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText variant="body" strong style={{ color: selected ? colors.text : colors.textMuted }}>
          {segment.label}
        </AppText>
        {segment.badge ? (
          <AppText variant="caption" color="textMuted">
            {segment.badge}
          </AppText>
        ) : null}
        {selected ? <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, backgroundColor: colors.link }} /> : null}
      </Pressable>
    );
  });

  const frame = { borderBottomWidth: 1, borderBottomColor: colors.border } as const;

  if (scrollable) {
    return (
      <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} style={frame} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {tabs}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="tablist" style={[{ flexDirection: "row", height }, frame]}>
      {tabs}
    </View>
  );
}

function ButtonSegments<T extends string>({
  segments,
  value,
  onChange,
  activeColor,
  dense,
}: PartProps<T> & { activeColor?: string; dense: boolean }) {
  const { colors } = useTheme();
  const height = dense ? 40 : 48;

  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", height, borderRadius: height / 2, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        const fill = activeColor ?? colors.purpleTint;
        const onFill = activeColor ? colors.onPrimary : colors.onPurpleTint;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            accessibilityState={{ selected }}
            android_ripple={ripple(selected ? onFill : colors.text)}
            onPress={() => onChange(segment.value)}
            style={{
              flex: 1,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? fill : "transparent",
            }}
          >
            <AppText variant={dense ? "body" : "bodyLg"} strong style={{ color: selected ? onFill : colors.textMuted }}>
              {segment.label}
            </AppText>
            {segment.badge ? (
              <AppText variant="caption" style={{ color: selected ? onFill : colors.textMuted }}>
                {segment.badge}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function HeroSegments<T extends string>({ segments, value, onChange }: PartProps<T>) {
  const { colors, radius } = useTheme();

  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", padding: 3, borderRadius: radius.pill, backgroundColor: colors.heroGlass }}>
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            accessibilityState={{ selected }}
            android_ripple={ripple(colors.onHero)}
            onPress={() => onChange(segment.value)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.pill,
              overflow: "hidden",
              backgroundColor: selected ? colors.onHero : "transparent",
            }}
          >
            <AppText variant="bodyLg" strong={selected} style={{ color: selected ? palette.dark.purpleTint : colors.onHero }}>
              {segment.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
