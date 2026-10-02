import { useEffect } from "react";
import { View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { AppText } from "@/components/ui/app-text";
import { VannaMark } from "@/components/ui/vanna-mark";
import { VannaSeal } from "@/components/ui/vanna-seal";
import { useTheme } from "@/theme/use-theme";
import type { EnvelopeStage } from "@/types/margin-account";

type MarginEnvelopeProps = {
  address: string;
  stage: EnvelopeStage;
};

const WIDTH = 248;
const HEIGHT = 128;
const RISE = 76;
const LIFT = 62;
const CARD_WIDTH = 208;
const CARD_HEIGHT = 96;
const CORNER = 14;
const SEAL = 48;
const SHOULDER = CORNER;
const POINT = HEIGHT * 0.6;
const DECELERATE = Easing.bezier(0.05, 0.7, 0.1, 1);

const frontPath = `M0 ${SHOULDER} L${WIDTH / 2} ${POINT} L${WIDTH} ${SHOULDER} L${WIDTH} ${HEIGHT - CORNER} Q${WIDTH} ${HEIGHT} ${WIDTH - CORNER} ${HEIGHT} L${CORNER} ${HEIGHT} Q0 ${HEIGHT} 0 ${HEIGHT - CORNER} Z`;
const flapPath = `M0 ${CORNER} Q0 0 ${CORNER} 0 L${WIDTH - CORNER} 0 Q${WIDTH} 0 ${WIDTH} ${CORNER} L${WIDTH / 2} ${POINT} Z`;

function AccountCard({ address }: { address: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: CORNER, overflow: "hidden", padding: 14, justifyContent: "space-between", backgroundColor: colors.engraved }}>
      <Svg width={CARD_WIDTH} height={CARD_HEIGHT} style={{ position: "absolute", top: 0, left: 0 }}>
        {[44, 70, 96].map((radius) => (
          <Circle key={radius} cx={CARD_WIDTH - 24} cy={-4} r={radius} fill="none" stroke={colors.engravedRule} strokeWidth={1} />
        ))}
      </Svg>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <VannaMark size={22} />
        <AppText variant="body" strong color="onHero" style={{ letterSpacing: 0.4 }}>
          vanna
        </AppText>
      </View>
      <View style={{ gap: 2 }}>
        <AppText color="onHero" style={{ fontFamily: "monospace", fontSize: 17, lineHeight: 22 }}>
          {address}
        </AppText>
        <AppText variant="caption" color="onHeroMuted" style={{ letterSpacing: 1.6 }}>
          MARGIN ACCOUNT
        </AppText>
      </View>
    </View>
  );
}

// Sealed: as first shown. Waiting: the seal breathes while Solana confirms. Open: the tick draws into the seal, the flap
// opens and the account card rises out.
export function MarginEnvelope({ address, stage }: MarginEnvelopeProps) {
  const { colors } = useTheme();
  const flap = useSharedValue(1);
  const rise = useSharedValue(0);
  const breath = useSharedValue(0);
  const open = stage === "open";

  useEffect(() => {
    flap.value = withTiming(open ? 0 : 1, { duration: 320, easing: Easing.out(Easing.cubic) });
    rise.value = open ? withDelay(260, withTiming(1, { duration: 720, easing: DECELERATE })) : withTiming(0, { duration: 200 });
  }, [open, flap, rise]);

  useEffect(() => {
    if (stage !== "waiting") {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: 200 });
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(breath);
  }, [stage, breath]);

  const flapStyle = useAnimatedStyle(() => ({ opacity: flap.value, transform: [{ scaleY: flap.value }] }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -LIFT * rise.value }] }));
  const sealStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.1 * breath.value }] }));

  const edge = { stroke: colors.border, strokeWidth: 1 } as const;

  return (
    <View
      accessible
      accessibilityLabel={`Margin account ${address}${open ? ", open" : ""}`}
      style={{ width: WIDTH, height: HEIGHT + RISE }}
    >
      <Svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", top: RISE, left: 0 }}>
        <Rect width={WIDTH} height={HEIGHT} rx={CORNER} fill={colors.purpleTint} {...edge} />
      </Svg>
      <Animated.View style={[{ position: "absolute", top: RISE + 14, left: (WIDTH - CARD_WIDTH) / 2 }, cardStyle]}>
        <AccountCard address={address} />
      </Animated.View>
      <Svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", top: RISE, left: 0 }}>
        <Path d={frontPath} fill={colors.purpleTint} {...edge} />
      </Svg>
      <Animated.View style={[{ position: "absolute", top: RISE, left: 0, width: WIDTH, height: POINT, transformOrigin: "top" }, flapStyle]}>
        <Svg width={WIDTH} height={POINT}>
          <Path d={flapPath} fill={colors.purpleTint} {...edge} />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: "absolute", top: RISE + POINT - SEAL / 2 - 2, left: (WIDTH - SEAL) / 2 }, sealStyle]}>
        <VannaSeal key={open ? "open" : "closed"} size={SEAL} tick={open} />
      </Animated.View>
    </View>
  );
}
