import { Pressable, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type Segment<T extends string> = { value: T; label: string; badge?: string };

type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: "surface" | "hero";
  activeColor?: string;
};

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  tone = "surface",
  activeColor,
}: SegmentedControlProps<T>) {
  const { colors, radius } = useTheme();
  const hero = tone === "hero";
  const fill = activeColor ?? (hero ? colors.onHero : colors.segmentActive);
  const onFill = activeColor ? colors.onPrimary : hero ? "#2F1B61" : colors.text;
  const idle = hero ? colors.onHero : colors.textMuted;

  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", padding: 3, borderRadius: radius.pill, backgroundColor: hero ? colors.heroGlass : colors.segment }}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(segment.value)}
            style={{
              flex: 1,
              minHeight: 44,
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radius.pill,
              backgroundColor: selected ? fill : "transparent",
            }}
          >
            <AppText variant="bodyLg" strong={selected} style={{ color: selected ? onFill : idle }}>
              {segment.label}
            </AppText>
            {segment.badge ? (
              <AppText variant="body" style={{ color: selected ? onFill : idle }}>
                {segment.badge}
              </AppText>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
