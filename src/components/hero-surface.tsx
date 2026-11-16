import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import type { Family } from "@/theme/tokens";

/* The module header surface (design base.css .mh): linear-gradient(hang, h0 0%, h1 42%, h2 100%), a radial glow from the top right
   (110% 70% at 100% 0%), a dark shade from the top left (85% 40% at 0% 0%) and the family's contrast veil. Drawn in SVG so the CSS
   angle maps exactly onto the box. */
export function HeroSurface({ fam }: { fam: Family }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const u = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { w, h } = box;
  const a = (fam.hang * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2, cy = h / 2;

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} pointerEvents="none">
      {w > 0 && (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id={"surf" + u} gradientUnits="userSpaceOnUse" x1={cx - (dx * len) / 2} y1={cy - (dy * len) / 2} x2={cx + (dx * len) / 2} y2={cy + (dy * len) / 2}>
              <Stop offset="0" stopColor={fam.h[0]} />
              <Stop offset="0.42" stopColor={fam.h[1]} />
              <Stop offset="1" stopColor={fam.h[2]} />
            </LinearGradient>
            <RadialGradient id={"glow" + u} gradientUnits="userSpaceOnUse" cx={w} cy={0} rx={w * 1.1} ry={h * 0.7} fx={w} fy={0}>
              <Stop offset="0" stopColor={fam.glow} />
              <Stop offset="0.6" stopColor={fam.glow} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={"shade" + u} gradientUnits="userSpaceOnUse" cx={0} cy={0} rx={w * 0.85} ry={h * 0.4} fx={0} fy={0}>
              <Stop offset="0" stopColor="rgb(14,0,31)" stopOpacity={0.95} />
              <Stop offset="0.35" stopColor="rgb(14,0,31)" stopOpacity={0.82} />
              <Stop offset="0.7" stopColor="rgb(14,0,31)" stopOpacity={0.32} />
              <Stop offset="1" stopColor="rgb(14,0,31)" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={w} height={h} fill={`url(#surf${u})`} />
          <Rect width={w} height={h} fill={`url(#glow${u})`} />
          {fam.veil > 0 && <Rect width={w} height={h} fill="#000000" fillOpacity={fam.veil} />}
          <Rect width={w} height={h} fill={`url(#shade${u})`} />
        </Svg>
      )}
    </View>
  );
}
