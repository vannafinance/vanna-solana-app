import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "@/theme/tokens";

import { ORBIT_EXTENT, OrbitBackdrop } from "./orbit-backdrop";
import { TaglineCycle } from "./tagline-cycle";

const DESIGN_TAGLINE_TOP = 540;
const DESIGN_ORBIT_CENTER = 318;
const TAGLINE_HEIGHT = 136;
const ACTIONS_HEIGHT = 148;
const GAP = 24;
const MIN_SCALE = 0.5;
const INTRO_COPY_AT = 3100;
const QUICK_COPY_AT = 350;

type HeroStageProps = {
  intro?: boolean;
  children?: ReactNode;
};

export function HeroStage({ intro = false, children }: HeroStageProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12) + 16;
  const taglineTop = Math.min(DESIGN_TAGLINE_TOP, height - (TAGLINE_HEIGHT + GAP + ACTIONS_HEIGHT + bottomPadding));
  const artTop = insets.top + 8;
  const artHeight = Math.max(taglineTop - 16 - artTop, 0);
  const scale = Math.min(1, Math.max(MIN_SCALE, artHeight / ORBIT_EXTENT));
  const centerY = Math.min(DESIGN_ORBIT_CENTER, artTop + artHeight - (ORBIT_EXTENT / 2) * scale);

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.background }}>
      <OrbitBackdrop intro={intro} centerY={centerY} scale={scale} />
      <View style={{ position: "absolute", left: 0, right: 0, top: taglineTop }}>
        <TaglineCycle startAt={intro ? INTRO_COPY_AT : QUICK_COPY_AT} />
      </View>
      {children ? (
        <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: bottomPadding, gap: 8 }}>{children}</View>
      ) : null}
    </View>
  );
}
