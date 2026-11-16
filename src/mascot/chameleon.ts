/* Vanna chameleon generator, ported from the design (design/app.html, shared/chameleon.js, v3 19 Oct 2026). Same geometry and colours.
   markA() = full body, face() = head only (the health-factor gauge). Returns { vb, svg } where svg is the inner markup of an <svg>.
   The HF is one continuous ramp along the brand gradient: violet nose = healthiest, imperial red = the 1.10 liquidation line.
   Safe >= 1.50, Watch above 1.10, Liquidation at or below 1.10. */

export type Look = [number, number];
export type EyeKind = "stars" | "x" | "spiral" | "sad" | "closed" | "cry";
export type Mouth = "smile" | "line" | "frown" | "open" | "grin" | "wail" | "wavy" | null;
export type ChameleonOpts = {
  hf?: number;
  state?: HfState;
  pal?: keyof typeof SKINS;
  colours?: string[];
  skinFollowsState?: boolean;
  tail?: false | "orig" | "spiral" | "curl";
  legs?: boolean;
  mouth?: Mouth;
  far?: boolean;
  eyes?: EyeKind;
  eyeNear?: EyeKind;
  eyeFar?: EyeKind;
  lookNear?: Look;
  lookFar?: Look;
  lidNear?: number | "happy";
  lidFar?: number | "happy";
  tongue?: number | boolean;
  small?: boolean;
  pale?: boolean | number;
  pose?: "belly" | "tilt" | "flat";
  tile?: string | null;
  round?: boolean;
  mono?: string;
  vb?: string;
};

type HfState = "safe" | "watch" | "act";

const INK = "#111111";
const W = "#FFFFFF";
export const BRAND = ["#FC5457", "#B6479E", "#703AE6"];
export const RAMP: [number, string][] = [[1.0, "#B33C3E"], [1.1, "#FC5457"], [1.5, "#B6479E"], [2.5, "#703AE6"]];
const HF_MIN = 1.0, HF_MAX = 2.5;

const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (a: number[]) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
export const mix = (a: string, b: string, t: number) => {
  const A = hx(a), B = hx(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
};

export function ramp(hf: number) {
  const h = Math.max(HF_MIN, Math.min(HF_MAX, hf));
  for (let i = 1; i < RAMP.length; i++)
    if (h <= RAMP[i][0]) {
      const [h0, c0] = RAMP[i - 1], [h1, c1] = RAMP[i];
      return mix(c0, c1, (h - h0) / (h1 - h0));
    }
  return RAMP[RAMP.length - 1][1];
}
export const rampSkin = (hf: number) => [ramp(hf - 0.45), ramp(hf - 0.2), ramp(hf)];
export const ringOf = (hf: number) => mix(ramp(hf), "#FFFFFF", 0.38);

export const SKINS = {
  ds: BRAND,
  safe: rampSkin(1.86),
  watch: rampSkin(1.32),
  act: rampSkin(1.06),
  liq: ["#8F2F31", "#B33C3E", "#FC5457"],
  grey: ["#949494", "#595959", "#2C2C2C"],
};
export const stateOf = (hf: number): HfState => (hf >= 1.5 ? "safe" : hf > 1.1 ? "watch" : "act");
export const LABEL: Record<HfState, string> = { safe: "Safe", watch: "Watch", act: "Liquidation" };
export const hfFrac = (hf: number) => (hf - HF_MIN) / (HF_MAX - HF_MIN);

let n = 0;
const uid = (p: string) => p + "_" + ++n;
const f = (v: number) => (Math.round(v * 100) / 100).toString();

function grad(id: string, c: string[], x1: number, y1: number, x2: number, y2: number) {
  return (
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    c.map((col, i) => `<stop offset="${(i / (c.length - 1)).toFixed(2)}" stop-color="${col}"/>`).join("") +
    `</linearGradient>`
  );
}
function sp(cx: number, cy: number, r0: number, r1: number, a0: number, sweep: number, k: number) {
  const p: [number, number][] = [];
  for (let i = 0; i <= k; i++) {
    const t = i / k, a = ((a0 + sweep * t) * Math.PI) / 180, r = r0 + (r1 - r0) * t;
    p.push([cx + r * Math.cos(a), cy - r * Math.sin(a)]);
  }
  return p;
}
function arc(cx: number, cy: number, r: number, frac: number) {
  frac = Math.max(0, Math.min(0.999, frac));
  const a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI * frac;
  return `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))} A${f(r)} ${f(r)} 0 ${frac > 0.5 ? 1 : 0} 1 ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
}

type EyeOpts = { kind?: EyeKind; lid?: number | "happy"; hf?: number; state?: HfState };

// One eye = one health-factor ring: dark dial, ring (white, or the ramp arc filled to the HF), pupil that points on its own.
function eye(cx: number, cy: number, R: number, look: Look, o: EyeOpts, skinRef: string) {
  const dial = R * 0.84, rr = R * 0.6, sw = R * 0.2;
  let s = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(dial)}" fill="${INK}"/>`;
  if (o.lid === "happy")
    return s + `<path d="M${f(cx - rr)} ${f(cy + rr * 0.35)} Q${f(cx)} ${f(cy - rr * 0.95)} ${f(cx + rr)} ${f(cy + rr * 0.35)}" stroke="${W}" stroke-width="${f(sw * 0.85)}" stroke-linecap="round" fill="none"/>`;
  if ((typeof o.lid === "number" && o.lid >= 0.98) || o.kind === "closed")
    return s + `<path d="M${f(cx - rr)} ${f(cy)} Q${f(cx)} ${f(cy + rr * 0.55)} ${f(cx + rr)} ${f(cy)}" stroke="${W}" stroke-width="${f(sw * 0.8)}" stroke-linecap="round" fill="none"/>`;
  if (o.kind === "cry")
    return s + `<path d="M${f(cx - rr * 1.05)} ${f(cy - rr * 0.45)} L${f(cx)} ${f(cy + rr * 0.3)} L${f(cx + rr * 1.05)} ${f(cy - rr * 0.45)}" stroke="${W}" stroke-width="${f(sw * 0.9)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  if (o.kind === "x") {
    const k = rr * 0.78;
    return s + `<path d="M${f(cx - k)} ${f(cy - k)} L${f(cx + k)} ${f(cy + k)} M${f(cx + k)} ${f(cy - k)} L${f(cx - k)} ${f(cy + k)}" stroke="${W}" stroke-width="${f(sw * 0.95)}" stroke-linecap="round"/>`;
  }
  if (o.kind === "spiral") {
    const p = sp(cx, cy, rr * 1.05, 0.4, 90, 760, 60);
    return s + `<path d="M${p.map((q) => f(q[0]) + " " + f(q[1])).join(" L")}" stroke="${W}" stroke-width="${f(sw * 0.55)}" stroke-linecap="round" fill="none"/>`;
  }
  if (o.kind === "stars") {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? rr * 0.42 : rr * 1.02;
      pts.push(f(cx + r * Math.cos(a)) + "," + f(cy + r * Math.sin(a)));
    }
    return s + `<polygon points="${pts.join(" ")}" fill="#FFD25A" stroke="#FFD25A" stroke-width="${f(sw * 0.35)}" stroke-linejoin="round"/>`;
  }
  const ringCol = o.hf !== undefined && o.state ? ringOf(o.hf) : null;
  if (ringCol && o.hf !== undefined) {
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" stroke="${W}" stroke-opacity=".18" stroke-width="${f(sw)}" fill="none"/>`;
    s += `<path d="${arc(cx, cy, rr, Math.max(hfFrac(o.hf), 0.04))}" stroke="${ringCol}" stroke-width="${f(sw)}" stroke-linecap="round" fill="none"/>`;
  } else s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rr)}" stroke="${W}" stroke-width="${f(sw)}" fill="none"/>`;
  const lk: Look = o.kind === "sad" ? [look[0] * 0.4, 0.8] : look;
  s += `<circle cx="${f(cx + lk[0] * R * 0.3)}" cy="${f(cy + lk[1] * R * 0.3)}" r="${f(R * 0.22)}" fill="${W}"/>`;
  const lid = o.kind === "sad" ? Math.max(typeof o.lid === "number" ? o.lid : 0, 0.5) : typeof o.lid === "number" ? o.lid : 0;
  if (lid > 0) {
    const h = dial * 2 * lid, cid = uid("lid");
    s += `<clipPath id="${cid}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(dial + 0.2)}"/></clipPath><rect x="${f(cx - dial - 1)}" y="${f(cy - dial - 1)}" width="${f(dial * 2 + 2)}" height="${f(h + 1)}" fill="url(#${skinRef})" clip-path="url(#${cid})"/>`;
    s += `<path d="M${f(cx - dial * 0.92)} ${f(cy - dial + h)} L${f(cx + dial * 0.92)} ${f(cy - dial + h)}" stroke="${INK}" stroke-width="${f(sw * 0.5)}" stroke-linecap="round"/>`;
  }
  return s;
}

function tailPath(kind: "orig" | "spiral" | "curl") {
  if (kind === "orig") return { pts: sp(26, 62, 21, 7, 80, 330, 60), w0: 11, w1: 11 };
  const coil = kind === "spiral" ? sp(12, 60, 13, 4, 100, 420, 70) : sp(11, 60, 11, 8, 100, 250, 40);
  const e = coil[0], lead: [number, number][] = [];
  for (let i = 0; i < 14; i++) {
    const t = i / 14, u = 1 - t;
    lead.push([u * u * 31 + 2 * u * t * 19 + t * t * e[0], u * u * 43 + 2 * u * t * 49 + t * t * e[1]]);
  }
  return { pts: lead.concat(coil), w0: 12, w1: kind === "spiral" ? 3.5 : 4.5 };
}
function stroke(pts: [number, number][], w0: number, w1: number, paint: string) {
  if (w0 === w1)
    return `<path d="M${pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L")}" stroke="${paint}" stroke-width="${w0}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  let s = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const w = w0 + (w1 - w0) * (i / (pts.length - 2));
    s += `<path d="M${f(pts[i][0])} ${f(pts[i][1])} L${f(pts[i + 1][0])} ${f(pts[i + 1][1])}" stroke="${paint}" stroke-width="${f(w)}" stroke-linecap="round"/>`;
  }
  return s;
}

const MOUTH: Record<string, string> = {
  smile: `<path d="M125.5 41 Q115 50 103.5 46" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  line: `<path d="M125.5 41 Q115 48.5 104 48.5" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
  frown: `<path d="M125 43.5 Q115 42 104 49" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`,
  open: `<path d="M107 46 L125 39 L120 49 Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  grin: `<path d="M104 45 Q114 53 126 40 L121 49 Q113 52 104 45 Z" fill="${INK}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
  wail: `<path d="M103 46 Q111 60 123 53 L127 40 Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
  wavy: `<path d="M125 43 Q122 40 119 43 T113 43 T107 44 T103 46" stroke="${INK}" stroke-width="2" stroke-linecap="round" fill="none"/>`,
};
const NEAR = [103, 30, 11.5], FAR = [116.5, 17.5, 7.5];

function parts(o: ChameleonOpts, g: string) {
  const P = `url(#${g})`;
  let b = "";
  if (o.tail !== false) {
    const t = tailPath(o.tail || "orig");
    b += stroke(t.pts, t.w0, t.w1, P);
  }
  b += `<path d="M30 42 C 38 22 66 16 92 25" stroke="${P}" stroke-width="21" stroke-linecap="round" fill="none"/>`;
  if (o.legs !== false) b += `<path d="M48 36 L51 64" stroke="${P}" stroke-width="8" stroke-linecap="round"/><path d="M84 36 L87 64" stroke="${P}" stroke-width="8" stroke-linecap="round"/>`;
  b += `<path d="M86 12 L124 36 L118 46 L100 50 L88 40 Z" fill="${P}" stroke="${P}" stroke-width="8" stroke-linejoin="round"/>`;
  const m = o.mouth === undefined ? "smile" : o.mouth;
  if (m && MOUTH[m]) b += MOUTH[m];
  if (o.tongue) {
    const L = typeof o.tongue === "number" ? o.tongue : 13;
    b += `<path d="M121 43 L${f(121 + L)} 43" stroke="#FF3395" stroke-width="3.2" stroke-linecap="round"/><circle cx="${f(122 + L)}" cy="43" r="3.6" fill="#FF3395"/>`;
  }
  const e = { state: o.state, hf: o.hf };
  if (o.small) {
    b += `<circle cx="103" cy="30" r="${f(NEAR[2] * 0.7)}" fill="${INK}"/><circle cx="101.6" cy="29.2" r="${f(NEAR[2] * 0.3)}" fill="#FFFFFF"/>`;
    return b;
  }
  const kN = o.eyeNear || o.eyes, kF = o.eyeFar || o.eyes;
  if (o.far !== false)
    b += `<circle cx="${FAR[0]}" cy="${FAR[1]}" r="${f(FAR[2] * 1.18)}" fill="${P}"/>` + eye(FAR[0], FAR[1], FAR[2], o.lookFar || [0.7, -0.4], { ...e, lid: o.lidFar || 0, kind: kF }, g);
  b += `<circle cx="${NEAR[0]}" cy="${NEAR[1]}" r="${f(NEAR[2] * 1.12)}" fill="${P}"/>` + eye(NEAR[0], NEAR[1], NEAR[2], o.lookNear || [-0.7, -0.1], { ...e, lid: o.lidNear || 0, kind: kN }, g);
  return b;
}

function skinOf(o: ChameleonOpts) {
  let c: string[];
  if (o.colours) c = o.colours;
  else if (o.hf !== undefined && o.skinFollowsState !== false) c = rampSkin(o.hf);
  else c = SKINS[o.pal || "ds"] || BRAND;
  return o.pale ? c.map((x) => mix(x, "#FFFFFF", typeof o.pale === "number" ? o.pale : 0.42)) : c;
}

function pose(o: ChameleonOpts, body: string) {
  if (o.pose === "belly") return `<g transform="translate(0 94) scale(1 -1)">${body}</g>`;
  if (o.pose === "tilt") return `<g transform="rotate(-10 70 46)">${body}</g>`;
  if (o.pose === "flat") return `<g transform="translate(0 50) scale(1.12 .42) translate(-6 0)">${body}</g>`;
  return body;
}

export function markA(o: ChameleonOpts = {}) {
  if (o.hf !== undefined && !o.state) o = { ...o, state: stateOf(o.hf) };
  const g = uid("a");
  const c = o.mono ? [o.mono, o.mono] : skinOf(o);
  const L = o.tongue ? (typeof o.tongue === "number" ? o.tongue : 13) : 0;
  const right = Math.max(140, 122 + L + 6);
  const vb = o.vb || (o.pose === "belly" ? `0 4 ${right} 94` : `0 2 ${right} 90`);
  return { vb, svg: `<defs>${grad(g, c, 10, 84, 128, 8)}</defs>${pose(o, parts(o, g))}` };
}

export function face(o: ChameleonOpts = {}) {
  if (o.hf !== undefined && !o.state) o = { ...o, state: stateOf(o.hf) };
  const g = uid("f"), cp = uid("fc"), c = skinOf(o);
  const clip = o.round === false ? `<rect x="68" y="-5" width="70" height="70" rx="16"/>` : `<circle cx="103" cy="30" r="35"/>`;
  let s = `<defs>${grad(g, c, 10, 84, 128, 8)}<clipPath id="${cp}">${clip}</clipPath></defs><g clip-path="url(#${cp})">`;
  if (o.tile !== null) s += `<rect x="60" y="-10" width="90" height="90" fill="${o.tile || "#1E1E1E"}"/>`;
  s += parts({ legs: false, tail: false, lookNear: [0.6, 0.2], lookFar: [0.1, 0.4], ...o }, g) + `</g>`;
  return { vb: "68 -5 70 70", svg: s };
}
