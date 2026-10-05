import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";

import { materialSymbols } from "./material-symbols";

type BellArtProps = {
  size?: number;
};

// The empty Notifications page: a bell in the Vanna gradient inside two soft rings, with a small tick for "nothing waiting".
export function BellArt({ size = 132 }: BellArtProps) {
  const { colors } = useTheme();
  const bell = materialSymbols.notifications.regular;
  const tick = materialSymbols.check.regular;

  return (
    <Svg accessibilityLabel="No notifications" width={size} height={size} viewBox="0 0 132 132">
      <Defs>
        <LinearGradient id="bellFill" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FC5457" />
          <Stop offset="1" stopColor="#703AE6" />
        </LinearGradient>
      </Defs>
      <Circle cx="66" cy="66" r="64" fill={colors.purpleTint} opacity={0.45} />
      <Circle cx="66" cy="66" r="48" fill={colors.purpleTint} opacity={0.9} />
      <Circle cx="66" cy="66" r="48" fill="none" stroke="#703AE6" strokeOpacity={0.12} strokeWidth={1.5} />
      <Path d={bell} fill="url(#bellFill)" transform="translate(30 102) scale(0.075)" />
      <Circle cx="92" cy="94" r="14" fill={colors.surface} />
      <Circle cx="92" cy="94" r="11" fill="#1C7C83" />
      <Path d={tick} fill="#FFFFFF" transform="translate(81 105) scale(0.0225)" />
    </Svg>
  );
}
