import { StatusBar } from "expo-status-bar";
import { type ReactNode, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "@/theme/tokens";

import { ORBIT_EXTENT, OrbitBackdrop } from "./orbit-backdrop";
import { TaglineCycle } from "./tagline-cycle";

const DESIGN_TAGLINE_TOP = 540;
const DESIGN_ORBIT_CENTER = 318;
// Starting guesses for the two blocks at the bottom; each is measured once drawn, because their height depends on the phone's font
// setting and a block that is taller than assumed would run into the one beside it.
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
  const [taglineHeight, setTaglineHeight] = useState(TAGLINE_HEIGHT);
  const [actionsHeight, setActionsHeight] = useState(children ? ACTIONS_HEIGHT : 0);
  const taglineTop = Math.min(DESIGN_TAGLINE_TOP, height - (taglineHeight + GAP + actionsHeight + bottomPadding));
  const artTop = insets.top + 8;
  const artHeight = Math.max(taglineTop - 16 - artTop, 0);
  const scale = Math.min(1, Math.max(MIN_SCALE, artHeight / ORBIT_EXTENT));
  const centerY = Math.min(DESIGN_ORBIT_CENTER, artTop + artHeight - (ORBIT_EXTENT / 2) * scale);

  return (
    <View style={{ flex: 1, backgroundColor: palette.dark.background }}>
      {/* This screen is always dark, so the clock and the icons are always light, whatever the phone's theme. */}
      <StatusBar style="light" />
      <OrbitBackdrop intro={intro} centerY={centerY} scale={scale} />
      <View onLayout={(event) => setTaglineHeight(Math.ceil(event.nativeEvent.layout.height))} style={{ position: "absolute", left: 0, right: 0, top: taglineTop }}>
        <TaglineCycle startAt={intro ? INTRO_COPY_AT : QUICK_COPY_AT} />
      </View>
      {children ? (
        <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: bottomPadding, gap: 8 }}>
          <View onLayout={(event) => setActionsHeight(Math.ceil(event.nativeEvent.layout.height))} style={{ gap: 8 }}>
            {children}
          </View>
        </View>
      ) : null}
    </View>
  );
}
