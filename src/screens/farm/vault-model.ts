/* Farm vault detail model (design SCREENS['farm-vault'] / ['farm-position'], screens/farm.js): the per-kind constants and the sample
   series of the V7 design, ending on the live figures where the app has them. Real history: Phoenix's published funding rates
   (the source the web app's /api/solana/farm/funding uses, no key). Everything else the web serves from its own NAV history
   or the fork, so the chart shapes are the design's deterministic sample series. */

export const N = 120, DAY = 864e5, TODAY = Date.UTC(2026, 9, 7);
export const dayMs = (i: number) => TODAY - (N - 1 - i) * DAY;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dLbl = (ms: number) => {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
};
export const sinceIdx = (s: string) => {
  const d = Date.parse(s + " 2026 UTC");
  return isFinite(d) ? Math.max(0, Math.min(N - 1, N - 1 - Math.round((TODAY - d) / DAY))) : N - 1;
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  let u = 0, v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const sdev = (a: number[]) => {
  const m = avg(a);
  return Math.sqrt(avg(a.map((x) => (x - m) ** 2)));
};

/* ---------- per-kind constants (design KAM / VAULTS / PER / BLEND / LPS) ---------- */
export const KAM_X: Record<string, { depU: number; borU: number; borA: number; util: number; dep: number; rc: string }> = {
  "kamino-sol": { depU: 270052719.73, borU: 244350557.4, borA: 5.4, util: 90.48, dep: 2.32e6, rc: "kSOL" },
  "kamino-usdc": { depU: 122289228.91, borU: 111496333.85, borA: 5.96, util: 91.17, dep: 122.31e6, rc: "kUSDC" },
  "kamino-usdt": { depU: 11105247.27, borU: 9772257.64, borA: 5.76, util: 88.0, dep: 11.11e6, rc: "kUSDT" },
};
export const BLEND_X: Record<string, { label: string; depU: number; borU: number; borA: number; util: number; rc: string; rate: number; sup: number }> = {
  "blend-xlm": { label: "XLM", depU: 23013658.56, borU: 21230285.08, borA: 781.37, util: 92.25, rc: "bXLM", rate: 2.28, sup: 493.83 },
  "blend-usdc": { label: "USDC", depU: 130678.5, borU: 102870.97, borA: 3.89, util: 78.72, rc: "bUSDC", rate: 1.064, sup: 2.74 },
};
export type Basis = { asset: string; perp: string; fMean: number; fVol: number; perpFee: number; exec: number; mtm: number; tvl: number; cap: number; seed: number; neg: number[]; delta: number; share: string; target: number; sq: number };
export const BASIS_X: Record<string, Basis> = {
  "basis-sol": { asset: "SOL", perp: "SOL-PERP", fMean: 13.0, fVol: 3.5, perpFee: 1.6, exec: 0.3, mtm: 0.0004, tvl: 61.8e3, cap: 100e3, seed: 4, neg: [97, 98, 107], delta: 0.06, share: "vbSOL", target: 10.63, sq: 76 },
  "basis-eth": { asset: "ETH", perp: "ETH-PERP", fMean: 11.0, fVol: 3, perpFee: 1.4, exec: 0.3, mtm: 0.00035, tvl: 118.4e3, cap: 300e3, seed: 20, neg: [99, 100, 110], delta: 0.3, share: "vbETH", target: 8.63, sq: 81 },
  "basis-btc": { asset: "BTC", perp: "BTC-PERP", fMean: 9.4, fVol: 2.5, perpFee: 1.2, exec: 0.2, mtm: 0.0003, tvl: 402.6e3, cap: 750e3, seed: 1, neg: [93, 108], delta: -0.03, share: "vbBTC", target: 7.19, sq: 92 },
  "basis-tsla": { asset: "TSLA", perp: "TSLA-PERP", fMean: 9.0, fVol: 3.5, perpFee: 1.6, exec: 0.4, mtm: 0.0005, tvl: 36.2e3, cap: 300e3, seed: 7, neg: [95, 104, 109], delta: 1.74, share: "vbTSLA", target: 6.85, sq: 64 },
  "basis-meta": { asset: "META", perp: "META-PERP", fMean: 8.0, fVol: 3, perpFee: 1.6, exec: 0.4, mtm: 0.0005, tvl: 21.4e3, cap: 200e3, seed: 11, neg: [96, 101, 106], delta: -1.62, share: "vbMETA", target: 5.92, sq: 71 },
};
export const PER_X: Record<string, { rc: string; tvl: number; sp: number; spP: number; apy7: number; holders: number; rec30: number; roi: number; mdd: number; who: string }> = {
  usdstar: { rc: "USD*", tvl: 11472093.92, sp: 1.101795, spP: 1.101916, apy7: 9.46, holders: 8568, rec30: 9.21, roi: 1.84, mdd: 0.002, who: "For most depositors" },
  junior: { rc: "USD* Junior", tvl: 1520887.48, sp: 1.089171, spP: 1.08924, apy7: 14.18, holders: 388, rec30: 13.6, roi: 2.71, mdd: 0.011, who: "Takes first loss on USD* for a higher yield" },
};
export const LP_X: Record<string, { venue: string; shares: number; ra: number; rb: number; fee: number; addr: string }> = {
  "soroswap-xlm": { venue: "Soroswap", shares: 128440.12, ra: 252780.3, rb: 48414.0, fee: 0.3, addr: "CDVAIO…5RFKDB" },
  "aquarius-xlm": { venue: "Aquarius", shares: 41862.4, ra: 100290.4, rb: 19206.9, fee: 0.3, addr: "CD3LFM…TT32BX" },
};
export const HEDGE = 1; // the spot leg is the margin for an equal 1x short: funding is earned on 100% of the deposit; no vault, deposit or exit fee

/* ---------- basis series (design build()) ---------- */
export type BasisSeries = { f: number[]; apy: number[]; sp: number[]; fundingNow: number; funding7: number; funding30: number; apy7: number; apy30: number; apy90: number; apyAll: number; sharpe: number; mdd: number; negDays30: number };
export function buildBasis(v: Basis): BasisSeries {
  const r = rng(v.seed), f: number[] = [];
  let x = v.fMean;
  for (let i = 0; i < N; i++) {
    x = v.fMean + 0.75 * (x - v.fMean) + gauss(r) * v.fVol * 0.6;
    f.push(Math.max(3, x));
  }
  const m = avg(f);
  for (let i = 0; i < N; i++) f[i] += v.fMean - m;
  v.neg.forEach((i) => (f[i] = -(1.5 + 4 * r())));
  const net0 = (i0: number) => avg(f.slice(i0).map((fi) => fi * HEDGE - v.perpFee * HEDGE - v.exec));
  const shift = (v.target - net0(N - 7)) / HEDGE;
  for (let i = 0; i < N; i++) if (!v.neg.includes(i)) f[i] += shift;
  const gross = f.map((fi) => fi * HEDGE - v.perpFee * HEDGE - v.exec), apy = gross.slice();
  let acc = 1, mm = 0;
  const sp = [1];
  for (let i = 1; i < N; i++) {
    acc *= 1 + apy[i] / 36500;
    mm = 0.55 * mm + gauss(r) * v.mtm;
    sp.push(acc * (1 + mm));
  }
  const ret = sp.slice(1).map((p, i) => p / sp[i] - 1);
  let pk = sp[0], mdd = 0;
  sp.forEach((p) => {
    pk = Math.max(pk, p);
    mdd = Math.min(mdd, p / pk - 1);
  });
  const f30 = f.slice(N - 30);
  return {
    f, apy, sp, fundingNow: f[N - 1], funding7: avg(f.slice(N - 7)), funding30: avg(f30), apy7: avg(apy.slice(N - 7)), apy30: avg(apy.slice(N - 30)), apy90: avg(apy.slice(N - 90)),
    apyAll: (Math.pow(sp[N - 1] / sp[0], 365 / (N - 1)) - 1) * 100, sharpe: (avg(ret) / sdev(ret)) * Math.sqrt(365), mdd: mdd * 100, negDays30: f30.filter((z) => z < 0).length,
  };
}

export function monthly(sp: number[], basisK: "roi" | "apy") {
  const out: Record<number, { y: number; m: number; i0: number; i1: number }> = {};
  for (let i = 0; i < N; i++) {
    const d = new Date(dayMs(i)), k = d.getUTCFullYear() * 12 + d.getUTCMonth();
    (out[k] = out[k] || { y: d.getUTCFullYear(), m: d.getUTCMonth(), i0: i, i1: i }).i1 = i;
  }
  return Object.values(out)
    .sort((a, b) => b.y * 12 + b.m - (a.y * 12 + a.m))
    .map((o) => {
      const base = o.i0 > 0 ? sp[o.i0 - 1] : sp[0], roi = sp[o.i1] / base - 1, days = o.i1 - o.i0 + 1;
      return { l: `${MON[o.m]} ${o.y}`, v: (basisK === "apy" ? Math.pow(1 + roi, 365 / days) - 1 : roi) * 100, mtd: o.i1 === N - 1 && new Date(dayMs(N - 1)).getUTCDate() < 28 };
    });
}

/* ---------- lending / receipts series (design kamRates, perSeries, blendSeries) ---------- */
export function kamRates(dep: number, sup0: number, borA: number) {
  const r = rng((Math.round(dep) % 997) + 3), sup: number[] = [];
  let x = sup0;
  for (let i = 0; i < N; i++) {
    x = sup0 + 0.8 * (x - sup0) + gauss(r) * 0.22;
    sup.push(Math.max(0.5, x));
  }
  const sh = sup0 - sup[N - 1];
  for (let i = 0; i < N; i++) sup[i] += sh;
  return { sup, bor: sup.map((s, i) => (s * borA) / (sup0 || 1) + Math.sin(i / 9) * 0.05), avg30: avg(sup.slice(N - 30)) };
}
export function perSeries(sp: number, apy7: number, holders: number) {
  const d: number[] = [], r = rng(holders);
  let v = sp;
  for (let i = N - 1; i >= 0; i--) {
    d.unshift(v);
    v = (v / (1 + apy7 / 36500)) * (1 + gauss(r) * 0.00004);
  }
  return d;
}
export function blendSeries(id: string, sup: number, rate: number) {
  const r = rng(id.length * 977), pts: number[] = [];
  let x = rate;
  for (let i = 0; i < N; i++) {
    pts.unshift(x);
    x = x / (1 + Math.max(0.0002, (sup / 36500) * (0.85 + r() * 0.3)));
  }
  return pts;
}

/* ---------- "your position" series: principal + yield so far ---------- */
export function posSeries(since: string, amt: number, earned: number, price: number, sp?: number[]) {
  const i0 = sinceIdx(since), val: number[] = [], earn: number[] = [];
  for (let i = i0; i < N; i++) {
    let e = (earned * (i - i0)) / Math.max(1, N - 1 - i0);
    if (sp) {
      const den = sp[N - 1] - sp[i0];
      if (den > 0) e = (earned * Math.max(0, sp[i] - sp[i0])) / den;
    }
    val.push((amt + e) * price);
    earn.push(e * price);
  }
  return { val, earn, first: i0 };
}

/* Chart axis helper (design niceStep). */
export function niceStep(span: number) {
  const raw = span / 4 || 1, p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}
