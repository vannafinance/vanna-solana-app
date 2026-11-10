import { Image } from "expo-image";
import { useId } from "react";
import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop, SvgXml } from "react-native-svg";

import { LOGO_PNG, LOGO_SVG } from "@/generated/logos";
import { VANNA_SHAPE, WORDMARK_PATHS } from "@/generated/brand";
import { font } from "@/theme/tokens";

// The Vanna mark (design core.js vmark / vmarkW). tone: logo = its own gradient, lift = the lighter gradient, white = on the brand gradient.
export function VannaMark({ size = 30, tone = "logo" }: { size?: number; tone?: "logo" | "lift" | "white" }) {
  const stops = tone === "lift" ? ["#FF7679", "#A88BFF"] : ["#F6535D", "#7038E6"];
  // unique per instance: on web every <svg> shares one id space
  const id = "vm" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg width={size} height={size} viewBox="11 12 232 232">
      {tone !== "white" && (
        <Defs>
          <LinearGradient id={id} gradientUnits="userSpaceOnUse" x1="31.7" y1="73" x2="222.3" y2="183">
            <Stop offset="0" stopColor={stops[0]} />
            <Stop offset="1" stopColor={stops[1]} />
          </LinearGradient>
        </Defs>
      )}
      <Path fill={tone === "white" ? "#FFFFFF" : `url(#${id})`} fillRule="evenodd" d={VANNA_SHAPE} />
    </Svg>
  );
}

export function Wordmark({ height = 15, color = "#FFFFFF" }: { height?: number; color?: string }) {
  return (
    <Svg width={(height * 206) / 48} height={height} viewBox="0 0 206 48" accessibilityLabel="Vanna">
      {WORDMARK_PATHS.map((d, i) => (
        <Path key={i} d={d} fill={color} fillRule="evenodd" />
      ))}
    </Svg>
  );
}

// Header brand: mark + wordmark with the network under it (TESTNET), as the design's .mh-logo-m.
export function BrandLockup({ color = "#FFFFFF", net = "Testnet" }: { color?: string; net?: string | null }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }} accessibilityLabel={`Vanna${net ? ", " + net.toLowerCase() : ""}`}>
      <VannaMark size={30} />
      <View style={{ gap: 3 }}>
        <Wordmark height={15} color={color} />
        {net && (
          <Text style={{ color, opacity: 0.86, fontFamily: font.semibold, fontSize: 11, lineHeight: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>{net}</Text>
        )}
      </View>
    </View>
  );
}

const FALLBACK: Record<string, string> = { ETH: "#627EEA", BTC: "#F7931A" };

// Real token / chain / wallet / venue logo from the design's logo set; a coloured initial when there is none.
export function TokenLogo({ sym, size = 36 }: { sym: string; size?: number }) {
  const png = (LOGO_PNG as Record<string, number>)[sym];
  if (png) return <Image source={png} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" accessible={false} />;
  const svg = LOGO_SVG[sym];
  if (svg) return <SvgXml xml={svg} width={size} height={size} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: FALLBACK[sym] ?? "#703AE6", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFFFFF", fontFamily: font.semibold, fontSize: Math.round(size * 0.4) }}>{sym.slice(0, 1)}</Text>
    </View>
  );
}

export const CHAIN_LOGO = { solana: "SOLANA_CHAIN", stellar: "STELLAR_CHAIN" } as const;
