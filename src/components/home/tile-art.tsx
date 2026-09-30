import { Image } from "expo-image";
import { Plant } from "phosphor-react-native";
import { View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, Rect, Stop } from "react-native-svg";

import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

const candles = [
  { wickTop: 42, bodyTop: 50, bodyHeight: 18, wickBottom: 78, faded: false },
  { wickTop: 30, bodyTop: 36, bodyHeight: 18, wickBottom: 62, faded: false },
  { wickTop: 52, bodyTop: 56, bodyHeight: 24, wickBottom: 88, faded: true },
  { wickTop: 16, bodyTop: 22, bodyHeight: 20, wickBottom: 50, faded: false },
  { wickTop: 28, bodyTop: 34, bodyHeight: 16, wickBottom: 56, faded: true },
  { wickTop: 4, bodyTop: 10, bodyHeight: 22, wickBottom: 40, faded: false },
  { wickTop: 0, bodyTop: 4, bodyHeight: 20, wickBottom: 30, faded: false },
] as const;

const farmBars = [
  { height: 18, opacity: 0.45 },
  { height: 30, opacity: 0.6 },
  { height: 44, opacity: 0.75 },
  { height: 66, opacity: 1 },
] as const;

export function PerpsArt() {
  const { colors } = useTheme();

  return (
    <Svg width={116} height={75} viewBox="0 0 140 90">
      {candles.map((candle, index) => {
        const x = 4 + index * 20;
        const opacity = candle.faded ? 0.45 : 1;
        return (
          <G key={x}>
            <Line x1={x + 6} x2={x + 6} y1={candle.wickTop} y2={candle.wickBottom} stroke={colors.onHero} strokeWidth={2} opacity={opacity} />
            <Rect x={x} y={candle.bodyTop} width={12} height={candle.bodyHeight} rx={4} fill={colors.onHero} opacity={opacity} />
          </G>
        );
      })}
    </Svg>
  );
}

export function SwapArt() {
  const { colors, radius } = useTheme();
  const ring = { borderWidth: 2, borderColor: colors.onHeroMuted, borderRadius: radius.pill, overflow: "hidden" } as const;

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={ring}>
        <TokenIcon symbol="USDC" size={44} />
      </View>
      <View style={[ring, { marginLeft: -10, width: 44, height: 44, backgroundColor: colors.onHero, alignItems: "center", justifyContent: "center" }]}>
        <Image source={require("../../../assets/images/vanna-mark.png")} style={{ width: 28, height: 28 }} contentFit="contain" />
      </View>
      <View style={[ring, { marginLeft: -10 }]}>
        <TokenIcon symbol="TSLAx" size={44} />
      </View>
    </View>
  );
}

export function EarnArt() {
  const { colors } = useTheme();

  return (
    <Svg width={150} height={72} viewBox="0 0 150 72">
      <Defs>
        <LinearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.onHero} stopOpacity="0.4" />
          <Stop offset="1" stopColor={colors.onHero} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d="M0 64 C40 60 70 48 100 32 S140 14 148 8 L148 72 L0 72 Z" fill="url(#earnFill)" />
      <Path d="M0 64 C40 60 70 48 100 32 S140 14 148 8" stroke={colors.onHero} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Circle cx={148} cy={8} r={4} fill={colors.onHero} />
    </Svg>
  );
}

export function FarmArt() {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 72 }}>
      {farmBars.map((bar) => (
        <View key={bar.height} style={{ width: 18, height: bar.height, borderRadius: 6, backgroundColor: colors.onHero, opacity: bar.opacity }} />
      ))}
      <Plant size={26} color={colors.onHero} weight="bold" style={{ marginLeft: 10 }} />
    </View>
  );
}
