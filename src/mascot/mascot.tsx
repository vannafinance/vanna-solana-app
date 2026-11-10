import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, View, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";

import { type ChameleonOpts, face, LABEL, type Look, markA, stateOf } from "./chameleon";

/* Mascot placements (design shared/mascot.js): Face = the HF gauge head, Body = the full chameleon (empty states, cheer).
   Idle loop as designed: blink 120 ms every 4 to 7 s, each eye glances on its own (300 ms ease, 1.5 to 3 s holds). Reduced motion
   stops it. The mascot is always on (no setting). */

const DARK_TILE = "#2E2C35";

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setRm).catch(() => {});
    const s = AccessibilityInfo.addEventListener("reduceMotionChanged", setRm);
    return () => s.remove();
  }, []);
  return rm;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: Look, b: Look, t: number): Look => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// Blink and glance state, stepped on timers (a face is a few hundred bytes of SVG, so a redraw per step is cheap).
function useIdle(base: { near: Look; far: Look }, enabled: boolean, glanceOn = true) {
  const [st, setSt] = useState({ lid: 0, near: base.near, far: base.far });
  const cur = useRef(st);
  useEffect(() => {
    cur.current = st;
  });

  useEffect(() => {
    if (!enabled) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));

    const blink = () => {
      [0.5, 0.99, 0.5, 0].forEach((lid, i) => later(i * 30 + 30, () => setSt((s) => ({ ...s, lid }))));
      later(rnd(4000, 7000), blink);
    };
    const glance = (which: "near" | "far") => {
      const from = cur.current[which];
      const to: Look = [rnd(-0.9, 0.9), rnd(-0.5, 0.5)];
      for (let i = 1; i <= 6; i++) later(i * 50, () => setSt((s) => ({ ...s, [which]: lerp(from, to, ease(i / 6)) })));
      later(rnd(1500, 3000), () => glance(which));
    };
    later(rnd(2500, 5000), blink);
    if (glanceOn) {
      later(rnd(800, 2000), () => glance("near"));
      later(rnd(1200, 2600), () => glance("far"));
    }
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [enabled, glanceOn]);

  return enabled ? st : { lid: 0, near: base.near, far: base.far };
}

const svgOf = (r: { vb: string; svg: string }, w: number, h: number, flip?: boolean) => {
  let body = r.svg;
  if (flip) {
    const v = r.vb.split(/[\s,]+/).map(Number);
    body = `<g transform="translate(${v[0] * 2 + v[2]} 0) scale(-1 1)">${body}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r.vb}" width="${w}" height="${h}">${body}</svg>`;
};

// The HF face. None at or below 1.10 or with no debt (design R: no chameleon in the liquidation zone).
export function MascotFace({ hf, size = 40, flip, idle = true, style }: { hf: number; size?: number; flip?: boolean; idle?: boolean; style?: ViewStyle }) {
  const { isDark } = useTheme();
  const rm = useReducedMotion();
  const live = isFinite(hf) && hf < 100 && hf > 1.1;
  const s = useIdle({ near: [0.6, 0.2], far: [0.1, 0.4] }, idle && !rm && live);
  const hf2 = Math.round(hf * 100) / 100;
  const xml = useMemo(
    () => (live ? svgOf(face({ hf: hf2, lookNear: s.near, lookFar: s.far, lidNear: s.lid, lidFar: s.lid, tile: isDark ? DARK_TILE : undefined }), size, size, flip) : ""),
    [live, hf2, s.near, s.far, s.lid, isDark, size, flip],
  );
  if (!live) return null;
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Health factor ${hf2.toFixed(2)}, ${LABEL[stateOf(hf2)]}`}
      style={[
        { width: size, height: size, borderRadius: size / 2, overflow: "hidden" },
        isDark && { borderWidth: 2, borderColor: "rgba(255,255,255,0.22)" },
        style,
      ]}
    >
      <SvgXml xml={xml} width={isDark ? size - 4 : size} height={isDark ? size - 4 : size} />
    </View>
  );
}

// Module skins (decorative): Earn teal, Margin / Spot / Perps violet, Farm pink; Portfolio and Predict wear the brand skin.
const tri = (a: string, b: string) => {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const m = h(a).map((v, i) => Math.round((v + h(b)[i]) / 2).toString(16).padStart(2, "0")).join("").toUpperCase();
  return [a, "#" + m, b];
};
export const MODULE_SKIN: Record<string, string[] | undefined> = {
  earn: tri("#2FC9C1", "#11838B"),
  margin: tri("#8D61EB", "#5029A3"),
  trade: tri("#8D61EB", "#5029A3"),
  farm: tri("#FF3395", "#E2087A"),
};

// The full body. Asleep (empty states): eyes closed, pale skin in the module's colour.
export function MascotBody({ width = 112, module, asleep, opts, flip }: { width?: number; module?: string; asleep?: boolean; opts?: ChameleonOpts; flip?: boolean }) {
  const rm = useReducedMotion();
  const s = useIdle({ near: [-0.7, -0.1], far: [0.7, -0.4] }, !rm);
  const colours = module ? MODULE_SKIN[module] : undefined;
  const h = Math.round((width * 90) / 140);
  const o: ChameleonOpts = asleep
    ? { tail: "orig", mouth: "line", pale: true, lookNear: s.near, lookFar: s.far, lidNear: s.lid, lidFar: s.lid, ...(colours ? { colours } : { pal: "ds" }), ...opts }
    : { tail: "orig", lookNear: s.near, lookFar: s.far, lidNear: s.lid, lidFar: s.lid, ...(colours ? { colours } : { pal: "ds" }), ...opts };
  const xml = svgOf(markA(o), width, h, flip);
  return (
    <View aria-hidden>
      <SvgXml xml={xml} width={width} height={h} />
    </View>
  );
}

// TX result face (design Mascot.filled): the brand face, ring eyes; the tongue strikes once (160 ms out, 180 ms back) with happy
// eyes while it is out, then the face idles (blinks).
export function MascotDone({ size = 56 }: { size?: number }) {
  const { isDark } = useTheme();
  const rm = useReducedMotion();
  const [tg, setTg] = useState(0);
  const s = useIdle({ near: [0.6, 0.1], far: [0.4, 0.2] }, !rm && tg === 0, false);
  useEffect(() => {
    if (rm) return;
    const t: ReturnType<typeof setTimeout>[] = [];
    const out = [3, 6, 9, 12], back = [9, 6, 3, 0];
    out.forEach((v, i) => t.push(setTimeout(() => setTg(v), 220 + i * 40)));
    back.forEach((v, i) => t.push(setTimeout(() => setTg(v), 220 + 160 + i * 45)));
    return () => t.forEach(clearTimeout);
  }, [rm]);
  const happy = tg > 12 * 0.6;
  const xml = svgOf(
    face({ pal: "ds", lookNear: s.near, lookFar: s.far, lidNear: happy ? "happy" : s.lid, lidFar: happy ? "happy" : s.lid, tongue: tg || undefined, tile: isDark ? DARK_TILE : undefined }),
    size,
    size,
  );
  return (
    <View aria-hidden style={[{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }, isDark && { borderWidth: 2, borderColor: "rgba(255,255,255,0.22)" }]}>
      <SvgXml xml={xml} width={isDark ? size - 4 : size} height={isDark ? size - 4 : size} />
    </View>
  );
}
