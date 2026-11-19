// Number formats from the design (core.js nf, usd, sUsd, pct, spct, levFmt, hfFmt). Minus signs are U+2212.

// en-US grouping without toLocaleString: on Hermes (Android) every toLocaleString call builds a native number formatter, and it
// was a quarter of all JS time while the screens repainted. Same output for the values the app shows ("1,234.50"): `min` to
// `max` fraction digits, trailing zeros trimmed down to `min`. Huge values (exponent notation in toFixed) keep the Intl path.
function grouped(a: number, min: number, max: number): string {
  if (a >= 1e21) return a.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
  let s = a.toFixed(max);
  if (max > min) {
    let end = s.length;
    const keep = s.indexOf(".") + 1 + min;
    while (end > keep && s.charCodeAt(end - 1) === 48) end--;
    s = s.slice(0, end);
    if (s.endsWith(".")) s = s.slice(0, -1);
  }
  const dot = s.indexOf(".");
  const int = dot < 0 ? s : s.slice(0, dot);
  if (int.length <= 3) return s;
  let out = "";
  for (let i = 0; i < int.length; i++) {
    if (i > 0 && (int.length - i) % 3 === 0) out += ",";
    out += int[i];
  }
  return dot < 0 ? out : out + s.slice(dot);
}

// A value not known yet (NaN) shows as "—" in every format, never as a made-up number.
export const nf = (n: number, d = 0) => (!Number.isFinite(n) ? "—" : (n < 0 ? "−" : "") + grouped(Math.abs(n), d, d));

export const usd = (n: number, d = 2) => !Number.isFinite(n) ? "—" : (n < 0 && /[1-9]/.test(nf(Math.abs(n), d)) ? "−$" : "$") + nf(Math.abs(n), d);
export const sUsd = (n: number, d = 2) => !Number.isFinite(n) ? "—" : (n >= 0 ? "+$" : "−$") + nf(Math.abs(n), d);
export const pct = (n: number, d = 2) => !Number.isFinite(n) ? "—" : (n < 0 ? "−" : "") + nf(Math.abs(n), d) + "%";
export const spct = (n: number, d = 2) => !Number.isFinite(n) ? "—" : (n >= 0 ? "+" : "−") + nf(Math.abs(n), d) + "%";
export const levFmt = (l: number) => (isFinite(l) ? nf(l, 2) + "x" : "None");
export const hfFmt = (h: number) => (isFinite(h) && h < 100 ? nf(h, 2) : "No debt");
// Token amounts: stable coins to the cent; every other token shows up to 4 digits (6 for dust) so a review never rounds 0.1234 SOL to 0.12.
const STABLE_SYM = new Set(["USDC", "USDT", "JupUSD", "PYUSD", "phUSD", "USDS", "USDG"]);
export const tokFmt = (n: number, sym: string) => {
  const a = Math.abs(n), stable = STABLE_SYM.has(sym.replace(/^v/, ""));
  const min = a >= 0.01 ? 2 : 4, max = stable ? min : a >= 1000 ? 2 : a >= 0.01 ? 4 : 6;
  return `${(n < 0 ? "−" : "") + grouped(a, min, max)} ${sym}`;
};

// pos / neg / '' with the design's half-cent dead zone.
export const sign = (n: number) => (n > 0.004 ? "pos" : n < -0.004 ? "neg" : "");
