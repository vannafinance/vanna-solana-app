// Number formats from the design (core.js nf, usd, sUsd, pct, spct, levFmt, hfFmt). Minus signs are U+2212.

export const nf = (n: number, d = 0) =>
  (n < 0 ? "−" : "") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const usd = (n: number, d = 2) => (n < 0 && /[1-9]/.test(nf(Math.abs(n), d)) ? "−$" : "$") + nf(Math.abs(n), d);
export const sUsd = (n: number, d = 2) => (n >= 0 ? "+$" : "−$") + nf(Math.abs(n), d);
export const pct = (n: number, d = 2) => (n < 0 ? "−" : "") + nf(Math.abs(n), d) + "%";
export const spct = (n: number, d = 2) => (n >= 0 ? "+" : "−") + nf(Math.abs(n), d) + "%";
export const levFmt = (l: number) => (isFinite(l) ? nf(l, 2) + "x" : "None");
export const hfFmt = (h: number) => (isFinite(h) && h < 100 ? nf(h, 2) : "No debt");
export const tokFmt = (n: number, sym: string) => `${nf(n, Math.abs(n) >= 0.01 ? 2 : 4)} ${sym}`;

// pos / neg / '' with the design's half-cent dead zone.
export const sign = (n: number) => (n > 0.004 ? "pos" : n < -0.004 ? "neg" : "");
